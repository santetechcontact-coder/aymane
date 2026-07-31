import { describe, expect, it } from "vitest";
import {
  matchesDirectorySearch,
  mergeDirectoryStructures,
  publicHealthStructures,
  structureDirectionsUrl,
  type DirectoryStructure,
} from "./public-health-structures";

const partner: DirectoryStructure = {
  ...publicHealthStructures[0],
  id: "partner-1",
  source: "aymane_partner",
  source_name: "AYMANE",
  source_url: "",
};

describe("public health directory", () => {
  it("ships a useful Dakar catalogue without duplicate identifiers", () => {
    expect(publicHealthStructures.length).toBeGreaterThan(100);
    expect(new Set(publicHealthStructures.map((item) => item.id)).size).toBe(publicHealthStructures.length);
  });

  it("matches accents, names and localities", () => {
    const fann = publicHealthStructures.find((item) => item.name.includes("Fann"));
    const guediawaye = publicHealthStructures.find((item) => item.city === "Guediawaye");

    expect(fann && matchesDirectorySearch(fann, "hopital fann")).toBe(true);
    expect(guediawaye && matchesDirectorySearch(guediawaye, "guédiawaye")).toBe(true);
  });

  it("keeps a partner entry before its public duplicate", () => {
    const merged = mergeDirectoryStructures([partner]);
    const duplicate = merged.filter((item) => item.name === partner.name && item.city === partner.city);

    expect(duplicate).toHaveLength(1);
    expect(duplicate[0].source).toBe("aymane_partner");
  });

  it("creates an encoded directions link", () => {
    const url = structureDirectionsUrl(publicHealthStructures[0]);

    expect(url).toContain("google.com/maps/dir");
    expect(url).toContain("destination=");
  });
});
