"use client";

import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import type { SyncData } from "@/lib/types";

// Household data kept on the device, so the shop screens work without signal.
// External store (not React state) so every screen shares one copy.

const DATA_KEY = "rateme:data";
const FOR_WHOM_KEY = "rateme:forWhom";
const CATEGORY_KEY = "rateme:category";
const OUTBOX_KEY = "rateme:outbox";

// "error": the server answered with a failure (not the same as no signal)
export type SyncStatus = "idle" | "syncing" | "ok" | "offline" | "error" | "unauthorized";
export type ForWhom = "all" | number;

interface StoreState {
  data: SyncData | null;
  status: SyncStatus;
  forWhom: ForWhom;
  // Category filter on the home screen: "all" or a category id
  category: CategoryFilter;
  // Changes made without signal, waiting to be sent
  pending: number;
}

// A change that can be sent later; list endpoints are safe to repeat
interface QueuedRequest {
  url: string;
  method: string;
  json?: unknown;
  // Removed by this id after sending, so two tabs sharing the queue never drop an unsent change
  key?: string;
}

export type CategoryFilter = "all" | number;

const SERVER_STATE: StoreState = { data: null, status: "idle", forWhom: "all", category: "all", pending: 0 };

let state: StoreState | null = null;
const listeners = new Set<() => void>();

function readLocal(): StoreState {
  let data: SyncData | null = null;
  let forWhom: ForWhom = "all";
  let category: CategoryFilter = "all";
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (raw) data = normalize(JSON.parse(raw));
    const fw = localStorage.getItem(FOR_WHOM_KEY);
    if (fw && fw !== "all" && Number.isInteger(Number(fw))) forWhom = Number(fw);
    const cat = localStorage.getItem(CATEGORY_KEY);
    if (cat && cat !== "all" && Number.isInteger(Number(cat))) category = Number(cat);
  } catch {
    // Corrupted cache, a fresh sync will replace it
  }
  return { data, status: "idle", forWhom, category, pending: readOutbox().length };
}

// Copies saved by older app versions miss newer fields
function normalize(data: SyncData): SyncData {
  return {
    ...data,
    list: data.list ?? [],
    products: data.products.map((p) => ({ ...p, skippedBy: p.skippedBy ?? [] })),
  };
}

function readOutbox(): QueuedRequest[] {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeOutbox(items: QueuedRequest[]) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
  setState({ pending: items.length });
}

function getState(): StoreState {
  if (!state) state = readLocal();
  return state;
}

function setState(patch: Partial<StoreState>) {
  state = { ...getState(), ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStore() {
  return useSyncExternalStore(subscribe, getState, () => SERVER_STATE);
}

let inflight: Promise<void> | null = null;
// Bumped on every local change, so a sync that started earlier cannot bring old data back
let localVersion = 0;

export function sync(): Promise<void> {
  if (inflight) return inflight;
  // Send changes made offline first; while some are still waiting, keep the local copy
  if (readOutbox().length > 0) {
    return flush().then(() => (readOutbox().length > 0 ? setState({ status: "offline" }) : sync()));
  }
  setState({ status: "syncing" });
  const startedAt = localVersion;
  inflight = (async () => {
    try {
      // Weak signal in a shop: give up after a while and show the local copy
      const res = await fetch("/api/sync", { cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (res.status === 401) {
        clearLocalData();
        setState({ status: "unauthorized" });
        return;
      }
      if (!res.ok) {
        // Server problem, e.g. the database is down: keep the local copy but say so
        setState({ status: "error" });
        return;
      }
      const data: SyncData = normalize(await res.json());
      if (startedAt !== localVersion) {
        // A change was made meanwhile; the follow-up sync after that change brings fresh data
        setState({ status: "ok" });
        return;
      }
      localStorage.setItem(DATA_KEY, JSON.stringify(data));
      setState({ data, status: "ok" });
    } catch {
      // No signal: keep showing the last copy
      setState({ status: "offline" });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

let flushing: Promise<void> | null = null;

// Sends queued changes in order. Stops at the first network error and keeps the rest for later.
function flush(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    try {
      let queue = readOutbox();
      while (queue.length > 0) {
        try {
          await send(queue[0].url, { method: queue[0].method, json: queue[0].json });
        } catch (e) {
          const status = (e as { status?: number }).status;
          // No signal, session gone or server trouble: try again later
          if (!status || status === 401 || status >= 500) return;
          // Rejected for good (e.g. item deleted meanwhile): drop it, but say so
          toast.error(`Nie udało się zapisać zmiany zrobionej bez internetu: ${(e as Error).message}`);
        }
        const done = queue[0].key;
        queue = readOutbox().filter((r, i) => (done ? r.key !== done : i !== 0));
        writeOutbox(queue);
      }
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

// Sends changes still waiting from offline; used before switching person so they are not lost
export async function sendPending(): Promise<number> {
  await flush();
  return readOutbox().length;
}

// Changes the local copy at once and sends the change now or, without signal, later.
export function queueChange(request: QueuedRequest, patch: (data: SyncData) => SyncData) {
  const data = getState().data;
  if (data) saveLocal(patch(data));
  writeOutbox([...readOutbox(), { ...request, key: crypto.randomUUID() }]);
  flush().then(() => {
    if (readOutbox().length === 0) syncAfterChange();
  });
}

// A sync that started before a change would bring back old data, so wait for it and fetch again
function syncAfterChange(): Promise<void> {
  return inflight ? inflight.then(() => sync()) : sync();
}

export function setCategory(category: CategoryFilter) {
  localStorage.setItem(CATEGORY_KEY, String(category));
  setState({ category });
}

export function setForWhom(forWhom: ForWhom) {
  localStorage.setItem(FOR_WHOM_KEY, String(forWhom));
  setState({ forWhom });
}

export function clearLocalData() {
  localStorage.removeItem(DATA_KEY);
  localStorage.removeItem(FOR_WHOM_KEY);
  localStorage.removeItem(CATEGORY_KEY);
  localStorage.removeItem(OUTBOX_KEY);
  setState({ data: null, forWhom: "all", category: "all", pending: 0 });
}

function saveLocal(data: SyncData) {
  localVersion++;
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
  setState({ data });
}

// Changes the local copy right away and sends the change in the background of the UI.
// On failure only this change is undone (revert), so a later change made meanwhile stays,
// and the error is thrown with a user-facing message.
export async function mutateOptimistic(
  url: string,
  init: RequestInit & { json?: unknown },
  patch: (data: SyncData) => SyncData,
  revert: (data: SyncData) => SyncData,
): Promise<void> {
  const before = getState().data;
  if (before) saveLocal(patch(before));
  try {
    await send(url, init);
  } catch (e) {
    const now = getState().data;
    if (now && getState().status !== "unauthorized") saveLocal(revert(now));
    throw e;
  }
  // The server copy is the truth; refresh without making the user wait
  syncAfterChange();
}

async function send(url: string, init: RequestInit & { json?: unknown }) {
  const { json, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new Error("Brak połączenia. Zmiany można zapisywać tylko z internetem.");
  }
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) {
    clearLocalData();
    setState({ status: "unauthorized" });
    throw new Error("Sesja wygasła, zaloguj się ponownie");
  }
  if (!res.ok) throw Object.assign(new Error(body.error || "Coś nie zadziałało, spróbuj jeszcze raz"), { body, status: res.status });
  return body;
}

// Sends a change to the server and refreshes the local copy. Throws with a user-facing message.
export async function mutate<T = unknown>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const body = await send(url, init);
  await syncAfterChange();
  return body as T;
}
