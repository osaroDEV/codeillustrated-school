import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reducer, toast } from "./use-toast";

describe("reducer", () => {
  it("ADD_TOAST prepends the new toast to state", () => {
    const state = reducer(
      { toasts: [] },
      { type: "ADD_TOAST", toast: { id: "1", open: true } }
    );
    expect(state.toasts).toEqual([{ id: "1", open: true }]);
  });

  it("ADD_TOAST enforces the single-toast limit, dropping older toasts", () => {
    const withFirst = reducer(
      { toasts: [] },
      { type: "ADD_TOAST", toast: { id: "1", open: true } }
    );
    const withSecond = reducer(withFirst, {
      type: "ADD_TOAST",
      toast: { id: "2", open: true },
    });
    expect(withSecond.toasts).toHaveLength(1);
    expect(withSecond.toasts[0].id).toBe("2");
  });

  it("UPDATE_TOAST merges fields into the toast with a matching id", () => {
    const state = { toasts: [{ id: "1", open: true, title: "old" }] };
    const updated = reducer(state, {
      type: "UPDATE_TOAST",
      toast: { id: "1", title: "new" },
    });
    expect(updated.toasts[0]).toEqual({ id: "1", open: true, title: "new" });
  });

  it("UPDATE_TOAST leaves toasts with a different id untouched", () => {
    const state = { toasts: [{ id: "1", title: "a" }, { id: "2", title: "b" }] };
    const updated = reducer(state, {
      type: "UPDATE_TOAST",
      toast: { id: "1", title: "changed" },
    });
    expect(updated.toasts[1]).toEqual({ id: "2", title: "b" });
  });

  it("DISMISS_TOAST with a toastId sets only that toast's open to false", () => {
    const state = {
      toasts: [
        { id: "1", open: true },
        { id: "2", open: true },
      ],
    };
    const dismissed = reducer(state, { type: "DISMISS_TOAST", toastId: "1" });
    expect(dismissed.toasts[0].open).toBe(false);
    expect(dismissed.toasts[1].open).toBe(true);
  });

  it("DISMISS_TOAST without a toastId sets open to false for every toast", () => {
    const state = {
      toasts: [
        { id: "1", open: true },
        { id: "2", open: true },
      ],
    };
    const dismissed = reducer(state, { type: "DISMISS_TOAST", toastId: undefined });
    expect(dismissed.toasts.every((t) => t.open === false)).toBe(true);
  });

  it("REMOVE_TOAST with a toastId removes only that toast", () => {
    const state = { toasts: [{ id: "1" }, { id: "2" }] };
    const removed = reducer(state, { type: "REMOVE_TOAST", toastId: "1" });
    expect(removed.toasts).toEqual([{ id: "2" }]);
  });

  it("REMOVE_TOAST without a toastId clears every toast", () => {
    const state = { toasts: [{ id: "1" }, { id: "2" }] };
    const removed = reducer(state, { type: "REMOVE_TOAST", toastId: undefined });
    expect(removed.toasts).toEqual([]);
  });
});

describe("toast()", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("returns an id, dismiss, and update function", () => {
    const result = toast({ title: "Hello" });
    expect(typeof result.id).toBe("string");
    expect(typeof result.dismiss).toBe("function");
    expect(typeof result.update).toBe("function");
  });

  it("returns a different id on each call", () => {
    const first = toast({ title: "One" });
    const second = toast({ title: "Two" });
    expect(first.id).not.toBe(second.id);
  });
});
