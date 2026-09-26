"use client";

import { queueChange } from "@/lib/store";
import type { ListItem, SyncData } from "@/lib/types";

// Shopping list changes: applied on the phone at once, sent now or when the signal is back

// Local copy needs the new item right away, so build it here with the same id as the request
export function addItem(data: SyncData, text: string, productId: number | null) {
  const id = crypto.randomUUID();
  const item: ListItem = {
    id,
    text,
    productId,
    addedById: data.meId,
    boughtById: null,
    boughtAt: null,
    createdAt: new Date().toISOString(),
  };
  queueChange({ url: `/api/list/${id}`, method: "PUT", json: { text, productId } }, (d) => ({ ...d, list: [...d.list, item] }));
}

export function setBought(item: ListItem, bought: boolean) {
  const at = new Date().toISOString();
  queueChange({ url: `/api/list/${item.id}`, method: "PATCH", json: { bought, at } }, (d) => ({
    ...d,
    list: d.list.map((i) =>
      i.id === item.id ? { ...i, boughtById: bought ? d.meId : null, boughtAt: bought ? at : null } : i
    ),
  }));
}

export function removeItem(item: ListItem) {
  queueChange({ url: `/api/list/${item.id}`, method: "DELETE" }, (d) => ({ ...d, list: d.list.filter((i) => i.id !== item.id) }));
}

export function clearBought(data: SyncData) {
  const ids = data.list.filter((i) => i.boughtAt).map((i) => i.id);
  if (ids.length === 0) return;
  queueChange({ url: "/api/list/bought", method: "DELETE", json: { ids } }, (d) => ({
    ...d,
    list: d.list.filter((i) => !ids.includes(i.id)),
  }));
}

export function isOnList(data: SyncData, productId: number) {
  return data.list.some((i) => i.productId === productId && !i.boughtAt);
}
