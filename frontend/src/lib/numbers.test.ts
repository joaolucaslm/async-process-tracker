import { describe, expect, it } from "vitest";
import { parseNumbers, summariseNumbers } from "./numbers";

describe("parseNumbers", () => {
  it("parses a comma-separated list", () => {
    expect(parseNumbers("10, 20, 5")).toEqual({ ok: true, numbers: [10, 20, 5] });
  });

  it("accepts spaces and newlines as separators", () => {
    expect(parseNumbers("10 20\n5")).toEqual({ ok: true, numbers: [10, 20, 5] });
  });

  it("accepts negatives and decimals", () => {
    expect(parseNumbers("-1.5, 2, 0.25")).toEqual({
      ok: true,
      numbers: [-1.5, 2, 0.25],
    });
  });

  it("rejects an empty input", () => {
    const result = parseNumbers("   ");
    expect(result.ok).toBe(false);
  });

  it("names the token that is not a number", () => {
    const result = parseNumbers("10, abc, 5");
    expect(result).toEqual({ ok: false, error: '"abc" is not a number.' });
  });

  it("rejects more than 1000 numbers", () => {
    const result = parseNumbers(Array(1001).fill("1").join(","));
    expect(result.ok).toBe(false);
  });
});

describe("summariseNumbers", () => {
  it("shows every number when the list is short", () => {
    expect(summariseNumbers([1, 2, 3])).toBe("1, 2, 3");
  });

  it("truncates a long list with a count of the rest", () => {
    expect(summariseNumbers([1, 2, 3, 4, 5, 6, 7, 8], 3)).toBe(
      "1, 2, 3 … (+5 more)",
    );
  });
});
