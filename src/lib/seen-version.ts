"use client";

import { useSyncExternalStore } from "react";
import { APP_VERSION } from "@/lib/changelog";

// Remembers which version's changelog was seen on this phone, for the "something new" dot
const KEY = "rateme:seenVersion";
const listeners = new Set<() => void>();

export function markVersionSeen() {
  if (localStorage.getItem(KEY) === APP_VERSION) return;
  localStorage.setItem(KEY, APP_VERSION);
  listeners.forEach((l) => l());
}

export function useHasNewVersion() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => localStorage.getItem(KEY) !== APP_VERSION,
    () => false,
  );
}
