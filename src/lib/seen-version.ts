"use client";

import { useSyncExternalStore } from "react";
import { LATEST_NEWS } from "@/lib/changelog";

// Remembers which version's changelog was seen on this phone, for the "something new" dot
const KEY = "rateme:seenVersion";
const listeners = new Set<() => void>();

export function markVersionSeen() {
  if (localStorage.getItem(KEY) === LATEST_NEWS) return;
  localStorage.setItem(KEY, LATEST_NEWS);
  listeners.forEach((l) => l());
}

export function useHasNewVersion() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => localStorage.getItem(KEY) !== LATEST_NEWS,
    () => false,
  );
}
