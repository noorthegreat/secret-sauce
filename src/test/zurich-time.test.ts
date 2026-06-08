import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { currentZurichCycleStartMs, nextZurichMondayMidnightMs } from "@/lib/zurich-time";

// The weekly decision window is the cycle start (Mon 00:00 Zurich) + 36h
// (=> Tue 12:00 Zurich). This mirrors the client gate and the server-side
// enforce_decision_window() trigger.
const DECISION_WINDOW_MS = 36 * 60 * 60 * 1000;
const iso = (s: string) => Date.parse(s);
const setNow = (isoStr: string) => vi.setSystemTime(new Date(isoStr));

describe("zurich-time", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  describe("currentZurichCycleStartMs (last Monday 00:00 Europe/Zurich)", () => {
    it("summer (CEST, UTC+2): Wed resolves to Mon 00:00 = prev day 22:00Z", () => {
      setNow("2026-06-03T08:00:00Z"); // Wed 10:00 Zurich
      expect(currentZurichCycleStartMs()).toBe(iso("2026-05-31T22:00:00Z")); // Mon Jun 1 00:00 CEST
    });

    it("winter (CET, UTC+1): Wed resolves to Mon 00:00 = prev day 23:00Z", () => {
      setNow("2026-01-07T09:00:00Z"); // Wed 10:00 Zurich
      expect(currentZurichCycleStartMs()).toBe(iso("2026-01-04T23:00:00Z")); // Mon Jan 5 00:00 CET
    });

    it("exactly Monday 00:00 Zurich resolves to that same Monday", () => {
      setNow("2026-05-31T22:00:00Z"); // Mon Jun 1 00:00 CEST
      expect(currentZurichCycleStartMs()).toBe(iso("2026-05-31T22:00:00Z"));
    });

    it("Sunday night resolves back to the week's Monday", () => {
      setNow("2026-06-07T20:00:00Z"); // Sun Jun 7 22:00 Zurich
      expect(currentZurichCycleStartMs()).toBe(iso("2026-05-31T22:00:00Z")); // Mon Jun 1
    });
  });

  describe("weekly decision window (Mon 00:00 -> Tue 12:00 Zurich)", () => {
    const isOpen = () => {
      const start = currentZurichCycleStartMs();
      const now = Date.now();
      return now >= start && now < start + DECISION_WINDOW_MS;
    };

    it("open at Monday 00:30", () => {
      setNow("2026-05-31T22:30:00Z");
      expect(isOpen()).toBe(true);
    });

    it("open at Tuesday 11:00 (just before close)", () => {
      setNow("2026-06-02T09:00:00Z"); // Tue 11:00 CEST
      expect(isOpen()).toBe(true);
    });

    it("closed at Tuesday 13:00 (after the 12:00 cutoff)", () => {
      setNow("2026-06-02T11:00:00Z"); // Tue 13:00 CEST
      expect(isOpen()).toBe(false);
    });

    it("closed on Friday", () => {
      setNow("2026-06-05T10:00:00Z");
      expect(isOpen()).toBe(false);
    });
  });

  describe("nextZurichMondayMidnightMs (strictly future Monday 00:00)", () => {
    it("Wed -> the upcoming Monday", () => {
      setNow("2026-06-03T08:00:00Z");
      expect(nextZurichMondayMidnightMs()).toBe(iso("2026-06-07T22:00:00Z")); // Mon Jun 8 00:00 CEST
    });

    it("exactly Monday 00:00 -> the following Monday (never returns now)", () => {
      setNow("2026-05-31T22:00:00Z"); // Mon Jun 1 00:00
      expect(nextZurichMondayMidnightMs()).toBe(iso("2026-06-07T22:00:00Z")); // Mon Jun 8
    });
  });
});
