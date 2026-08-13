import { describe, expect, it } from "vitest";
import { events } from "@/data/events";
import { getSynodalPassages, synodalMetadata } from "@/data/synodal";

describe("локальный Синодальный перевод", () => {
  it("содержит православный состав 51+27 книг", () => {
    expect(synodalMetadata.books).toBe(78);
    expect(synodalMetadata.translation).toBe("Синодальный перевод");
    expect(synodalMetadata.license).toBe("Public Domain");
  });

  it("возвращает проверяемые тексты", () => {
    const creation = events.find((event) => event.id === "creation")!;
    const john = events.find((event) => event.id === "cana-wedding")!;
    expect(getSynodalPassages(creation.scriptureReferences[0])[0].verses[0].text).toBe("В начале сотворил Бог небо и землю.");
    expect(getSynodalPassages(john.scriptureReferences[0])[0].verses.length).toBeGreaterThan(1);
    const nativity = events.find((event) => event.id === "nativity")!;
    const nativityPassages = getSynodalPassages(nativity.scriptureReferences[0]);
    expect(nativityPassages).toHaveLength(2);
    expect(nativityPassages[1].displayRu).toBe("Мф. 1:18–25");
    expect(nativityPassages[1].verses[0].text).toContain("Рождество Иисуса Христа");
  });

  it("покрывает прямым текстом все события", () => {
    for (const event of events) {
      for (const reference of event.scriptureReferences) {
        const passages = getSynodalPassages(reference);
        expect(passages.length, event.id).toBeGreaterThan(0);
        expect(passages.every((passage) => passage.verses.length > 0), event.id).toBe(true);
      }
    }
  });
});
