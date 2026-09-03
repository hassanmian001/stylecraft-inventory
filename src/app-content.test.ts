import { describe, expect, it } from "vitest";

import { moduleCards, sections } from "./app-content";

describe("app navigation content", () => {
  it("defines one set of module cards per sidebar section", () => {
    expect(Object.keys(moduleCards).sort()).toEqual(sections.map((section) => section.id).sort());
  });

  it("uses distinct card titles for each section", () => {
    const cardTitleSets = sections.map((section) => moduleCards[section.id].map((card) => card.title).join("|"));

    expect(new Set(cardTitleSets).size).toBe(sections.length);
  });
});
