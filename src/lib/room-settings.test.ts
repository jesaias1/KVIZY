import { describe, expect, it } from "vitest";
import { defaultRoomSettings, normalizeRoomSettings } from "./room-settings";

describe("rumindstillinger", () => {
  it("falder tilbage til standard ved tom eller ødelagt input", () => {
    expect(normalizeRoomSettings(null)).toEqual(defaultRoomSettings());
    expect(normalizeRoomSettings("x")).toEqual(defaultRoomSettings());
  });

  it("beholder gyldige valg og fjerner ukendte kategorier", () => {
    const result = normalizeRoomSettings({
      count: 30,
      limitSec: 10,
      level: 4,
      categoryIds: ["cat-1", "cat-5", "cat-1", "findes-ikke", 7],
    });
    expect(result).toEqual({
      count: 30,
      limitSec: 10,
      level: 4,
      categoryIds: ["cat-1", "cat-5"],
    });
  });

  it("tillader mange kategorier og afviser ugyldige tal", () => {
    const many = Array.from({ length: 40 }, (_, i) => `cat-${i + 1}`);
    const result = normalizeRoomSettings({
      count: 99,
      limitSec: 1,
      level: 9,
      categoryIds: many,
    });
    expect(result.categoryIds).toHaveLength(40);
    expect(result.count).toBe(15);
    expect(result.limitSec).toBe(20);
    expect(result.level).toBe(3);
  });

  it("falder tilbage til standardkategorier, hvis ingen er gyldige", () => {
    expect(normalizeRoomSettings({ categoryIds: ["x"] }).categoryIds).toEqual(
      defaultRoomSettings().categoryIds,
    );
  });
});
