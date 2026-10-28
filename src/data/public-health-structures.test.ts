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

  it("reaches beyond Dakar with regional hospitals that keep their own region", () => {
    const outsideDakar = publicHealthStructures.filter((item) => item.region !== "Dakar");

    expect(outsideDakar.length).toBeGreaterThanOrEqual(15);
    expect(new Set(outsideDakar.map((item) => item.region)).size).toBeGreaterThanOrEqual(10);
    expect(outsideDakar.every((item) => item.type === "hospital")).toBe(true);

    const thies = publicHealthStructures.find((item) => item.city === "Thies");
    expect(thies?.region).toBe("Thies");
    expect(thies?.address).toBe("Region de Thies");
  });

  it("spells out the locality when it differs from the region", () => {
    const touba = publicHealthStructures.find((item) => item.city === "Touba");

    expect(touba?.region).toBe("Diourbel");
    expect(touba?.address).toBe("Touba, region de Diourbel");
  });

  it("lists enough pharmacies to be worth searching", () => {
    const pharmacies = publicHealthStructures.filter((item) => item.type === "pharmacy");

    expect(pharmacies.length).toBeGreaterThanOrEqual(10);
    expect(pharmacies.some((item) => matchesDirectorySearch(item, "pharmacie"))).toBe(true);
  });

  it("creates an encoded directions link", () => {
    const url = structureDirectionsUrl(publicHealthStructures[0]);

    expect(url).toContain("google.com/maps/dir");
    expect(url).toContain("destination=");
  });
});
