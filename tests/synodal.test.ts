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
    const nativityPassages = nativity.scriptureReferences.flatMap(getSynodalPassages);
    expect(nativityPassages).toHaveLength(2);
    expect(nativityPassages[1].displayRu).toBe("Мф. 1:18–25");
    expect(nativityPassages[1].verses[0].text).toContain("Рождество Иисуса Христа");
  });

  it("возвращает цитаты из всех Евангелий для общего события", () => {
    const resurrection = events.find((event) => event.id === "resurrection")!;
    const passages = resurrection.scriptureReferences.flatMap(getSynodalPassages);
    expect(resurrection.scriptureReferences.map((reference) => reference.bookId)).toEqual(["matthew", "mark", "luke", "john"]);
    expect(passages.map((passage) => passage.displayRu)).toEqual(["Мф. 28:1–10", "Мк. 16:1–11", "Лк. 24:1–12", "Ин. 20:1–18"]);
    expect(passages.every((passage) => passage.verses.length > 0)).toBe(true);
  });

  it("покрывает последовательность Лк. 4–5 прямым Синодальным текстом", () => {
    const temptation = events.find((event) => event.id === "temptation-christ")!;
    const returnToGalilee = events.find((event) => event.id === "return-galilee")!;
    const nazareth = events.find((event) => event.id === "nazareth-synagogue")!;
    const miraculousCatch = events.find((event) => event.id === "miraculous-catch")!;
    const temptationText = getSynodalPassages(temptation.scriptureReferences[0])[0].verses;
    expect(temptationText.find((verse) => verse.verse === 9)?.text).toContain("Иерусалим");
    expect(getSynodalPassages(returnToGalilee.scriptureReferences[0])[0].verses[0].text).toContain("в Галилею");
    expect(getSynodalPassages(nazareth.scriptureReferences[0])[0].verses[0].text).toContain("пришел в Назарет");
    const catchText = getSynodalPassages(miraculousCatch.scriptureReferences[0])[0].verses;
    expect(catchText[0].text).toContain("озера Геннисаретского");
    expect(catchText.at(-1)?.text).toContain("оставили все и последовали за Ним");
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
