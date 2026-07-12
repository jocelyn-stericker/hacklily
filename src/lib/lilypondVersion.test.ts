import {
  isUnstableVersion,
  parseLilyPondVersion,
  renderVersionFor,
} from "./lilypondVersion";

describe("lilypondVersion routing", () => {
  describe("parseLilyPondVersion", () => {
    test("parses a full x.y.z version", () => {
      expect(parseLilyPondVersion('\\version "2.26.0"')).toEqual([2, 26, 0]);
    });
    test("parses a major.minor version (patch defaults to 0)", () => {
      expect(parseLilyPondVersion('\\version "2.27"')).toEqual([2, 27, 0]);
    });
    test("parses a major-only version", () => {
      expect(parseLilyPondVersion('\\version "3"')).toEqual([3, 0, 0]);
    });
    test("tolerates surrounding whitespace and music", () => {
      const src = '{ c4 }\n\\version "2.27.1"\n% comment';
      expect(parseLilyPondVersion(src)).toEqual([2, 27, 1]);
    });
    test("returns null when no \\version is present", () => {
      expect(parseLilyPondVersion("{ c4 }")).toBeNull();
    });
  });

  describe("isUnstableVersion", () => {
    test("2.26.x → stable (boundary is exclusive)", () => {
      expect(isUnstableVersion('\\version "2.26.0"')).toBe(false);
      expect(isUnstableVersion('\\version "2.26.99"')).toBe(false);
    });
    test("2.27.x → unstable", () => {
      expect(isUnstableVersion('\\version "2.27.0"')).toBe(true);
      expect(isUnstableVersion('\\version "2.27.1"')).toBe(true);
    });
    test("3.0 → stable (only the 2.x > 26 branch is unstable)", () => {
      expect(isUnstableVersion('\\version "3.0.0"')).toBe(false);
    });
    test("missing \\version → stable (safe default)", () => {
      expect(isUnstableVersion("{ c4 }")).toBe(false);
    });
  });

  describe("renderVersionFor", () => {
    test("returns the backend version string", () => {
      expect(renderVersionFor('\\version "2.26.0"')).toBe("stable");
      expect(renderVersionFor('\\version "2.27.1"')).toBe("unstable");
      expect(renderVersionFor("{ c4 }")).toBe("stable");
    });
  });
});
