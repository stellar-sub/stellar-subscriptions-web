import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  SUBSCRIPTION_NOTES_STORAGE_PREFIX,
  subscriptionNotesStorageKey,
  useSubscriptionNotes,
} from "./useSubscriptionNotes";

const STORAGE_KEY = `${SUBSCRIPTION_NOTES_STORAGE_PREFIX}:testnet`;

function storedNotes(): Record<string, string> | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Record<string, string>) : null;
}

describe("useSubscriptionNotes", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts empty", () => {
    const { result } = renderHook(() => useSubscriptionNotes("testnet"));

    expect(result.current.notes).toEqual({});
    expect(result.current.getNote(1)).toBe("");
  });

  it("creates a note and persists it to localStorage", () => {
    const { result } = renderHook(() => useSubscriptionNotes("testnet"));

    act(() => {
      result.current.setNote(1, "Manual credit applied");
    });

    expect(result.current.getNote(1)).toBe("Manual credit applied");
    expect(result.current.notes).toEqual({ "1": "Manual credit applied" });
    expect(storedNotes()).toEqual({ "1": "Manual credit applied" });
  });

  it("updates an existing note", () => {
    const { result } = renderHook(() => useSubscriptionNotes("testnet"));

    act(() => {
      result.current.setNote("1", "First");
    });
    act(() => {
      result.current.setNote("1", "Second");
    });

    expect(result.current.getNote("1")).toBe("Second");
    expect(storedNotes()).toEqual({ "1": "Second" });
  });

  it("removes one note without touching the others", () => {
    const { result } = renderHook(() => useSubscriptionNotes("testnet"));

    act(() => {
      result.current.setNote(1, "Keep");
      result.current.setNote(2, "Remove");
    });
    act(() => {
      result.current.removeNote(2);
    });

    expect(result.current.getNote(1)).toBe("Keep");
    expect(result.current.getNote(2)).toBe("");
    expect(storedNotes()).toEqual({ "1": "Keep" });
  });

  it("clears a note when the new value is blank", () => {
    const { result } = renderHook(() => useSubscriptionNotes("testnet"));

    act(() => {
      result.current.setNote(1, "Note");
    });
    act(() => {
      result.current.setNote(1, "   ");
    });

    expect(result.current.notes).toEqual({});
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("clears every note for the network", () => {
    const { result } = renderHook(() => useSubscriptionNotes("testnet"));

    act(() => {
      result.current.setNote(1, "One");
      result.current.setNote(2, "Two");
    });
    act(() => {
      result.current.clearNotes();
    });

    expect(result.current.notes).toEqual({});
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("loads notes that were already stored", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ 7: "Imported" }));

    const { result } = renderHook(() => useSubscriptionNotes("testnet"));

    expect(result.current.getNote(7)).toBe("Imported");
  });

  it("keys notes by network so networks stay separate", () => {
    window.localStorage.setItem(subscriptionNotesStorageKey("mainnet"), JSON.stringify({ 1: "mainnet note" }));

    const { result: testnet } = renderHook(() => useSubscriptionNotes("testnet"));
    const { result: mainnet } = renderHook(() => useSubscriptionNotes("mainnet"));

    expect(testnet.current.getNote(1)).toBe("");
    expect(mainnet.current.getNote(1)).toBe("mainnet note");
  });
});
