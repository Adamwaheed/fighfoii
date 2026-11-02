"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

export const ADMIN_HEADER_SLOT = "admin-header-slot";

const subscribe = () => () => {};
const getSlot = () => document.getElementById(ADMIN_HEADER_SLOT);
const getServerSlot = () => null;

/**
 * Renders children into the admin header from anywhere in the page.
 *
 * A page's toolbar belongs to that page's component — it reads and writes state
 * the layout knows nothing about — but it should sit in the shared header bar.
 * A portal moves the DOM without moving the React tree, so handlers and state
 * keep working exactly as if the toolbar were still inline.
 */
export function HeaderPortal({ children }: { children: React.ReactNode }) {
  // useSyncExternalStore rather than an effect: the slot is server-rendered, so
  // it exists by the time this reads it, and there is no setState-in-effect.
  const slot = useSyncExternalStore(subscribe, getSlot, getServerSlot);
  return slot ? createPortal(children, slot) : null;
}
