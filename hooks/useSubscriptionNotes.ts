"use client";

import { useCallback, useEffect, useState } from "react";
import type { Network } from "@/types";

/** Notes for one network, keyed by subscription id. */
export type SubscriptionNotes = Record<string, string>;

export const SUBSCRIPTION_NOTES_STORAGE_PREFIX = "subs.subscription-notes";

/** The `localStorage` key holding a network's subscription notes. */
export function subscriptionNotesStorageKey(network: Network): string {
  return `${SUBSCRIPTION_NOTES_STORAGE_PREFIX}:${network}`;
}

function readNotes(network: Network): SubscriptionNotes {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(subscriptionNotesStorageKey(network));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
  } catch {
    return {};
  }
}

function writeNotes(network: Network, notes: SubscriptionNotes): void {
  if (typeof window === "undefined") return;
  try {
    const key = subscriptionNotesStorageKey(network);
    if (Object.keys(notes).length === 0) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(notes));
    }
  } catch {
    // Notes are a convenience: quota or privacy-mode failures must not break the page.
  }
}

export interface SubscriptionNotesApi {
  /** Every saved note for the network, keyed by subscription id. */
  notes: SubscriptionNotes;
  /** The note for one subscription, or an empty string. */
  getNote: (subscriptionId: number | string) => string;
  /** Create or update a note. Whitespace-only values clear it. */
  setNote: (subscriptionId: number | string, note: string) => void;
  /** Remove one subscription's note. */
  removeNote: (subscriptionId: number | string) => void;
  /** Remove every note for the network. */
  clearNotes: () => void;
}

/**
 * Merchant notes kept in browser `localStorage`, keyed by network and
 * subscription id. They are private to this browser and never go on-chain.
 */
export function useSubscriptionNotes(network: Network): SubscriptionNotesApi {
  const [notes, setNotes] = useState<SubscriptionNotes>(() => readNotes(network));

  // Switching networks loads that network's notes instead of showing the
  // previous network's values.
  useEffect(() => {
    setNotes(readNotes(network));
  }, [network]);

  const getNote = useCallback((subscriptionId: number | string) => notes[String(subscriptionId)] ?? "", [notes]);

  const setNote = useCallback(
    (subscriptionId: number | string, note: string) => {
      const next = { ...readNotes(network) };
      const key = String(subscriptionId);
      const trimmed = note.trim();
      if (trimmed) {
        next[key] = trimmed;
      } else {
        delete next[key];
      }
      writeNotes(network, next);
      setNotes(next);
    },
    [network],
  );

  const removeNote = useCallback(
    (subscriptionId: number | string) => {
      const next = { ...readNotes(network) };
      delete next[String(subscriptionId)];
      writeNotes(network, next);
      setNotes(next);
    },
    [network],
  );

  const clearNotes = useCallback(() => {
    writeNotes(network, {});
    setNotes({});
  }, [network]);

  return { notes, getNote, setNote, removeNote, clearNotes };
}
