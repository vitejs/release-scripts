import { describe, expect, it } from "vitest";
import { getPublishTag, validatePublishVersion } from "../src/publish.ts";

describe("getPublishTag", () => {
  for (const [version, expected] of [
    ["1.2.3-alpha.1", "alpha"],
    ["1.2.3-beta.2", "beta"],
  ] as const) {
    it(`maps ${version} to the matching npm prerelease tag`, () => {
      expect(getPublishTag(version)).toBe(expected);
    });
  }

  it("uses previous when publishing an older stable version", () => {
    expect(getPublishTag("1.2.3", "2.0.0")).toBe("previous");
  });

  it("uses the default npm tag for the newest stable version", () => {
    expect(getPublishTag("2.0.0", "1.2.3")).toBeUndefined();
  });
});

describe("validatePublishVersion", () => {
  for (const version of ["1.2.3-rc.1", "1.2.3-foobaralpha.1"]) {
    it(`rejects unsupported prerelease version ${version}`, () => {
      expect(() => validatePublishVersion(version)).toThrow(
        `Only alpha and beta prereleases are supported, received ${version}`,
      );
    });
  }

  it("rejects an invalid semantic version", () => {
    expect(() => validatePublishVersion("banana")).toThrow('Invalid publish version "banana"');
  });
});
