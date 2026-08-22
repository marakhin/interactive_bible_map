import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { commonCanonMetadata, commonCanonOsis, commonCanonOsisSet } from "../data/common-canon.ts";
import { events } from "../data/events.ts";

const bible = JSON.parse(await readFile(resolve("data/synodal-bible.json"), "utf8"));
const sourceBooks = new Map(bible.books.map((book) => [book.osis, book]));
const missingCommonBooks = commonCanonOsis.filter((osis) => !sourceBooks.has(osis));
if (missingCommonBooks.length) throw new Error(`Synodal source lacks common-canon books: ${missingCommonBooks.join(", ")}`);
const books = new Map(bible.books.filter((book) => commonCanonOsisSet.has(book.osis)).map((book) => [book.osis, book]));

const bookOsisById = {
  genesis: "Gen", exodus: "Exod", numbers: "Num", deuteronomy: "Deut", joshua: "Josh", judges: "Judg",
  "1-samuel": "1Sam", "2-samuel": "2Sam", "1-kings": "1Kgs", "2-kings": "2Kgs", jonah: "Jonah",
  isaiah: "Isa", jeremiah: "Jer", daniel: "Dan", ezra: "Ezra", nehemiah: "Neh", esther: "Esth",
  matthew: "Matt", mark: "Mark", luke: "Luke", john: "John", acts: "Acts",
};

const bookOsisByDisplay = {
  "Быт": "Gen", "Исх": "Exod", "Чис": "Num", "Втор": "Deut", "Нав": "Josh", "Суд": "Judg",
  "1 Цар": "1Sam", "2 Цар": "2Sam", "3 Цар": "1Kgs", "4 Цар": "2Kgs", "Ион": "Jonah",
  "Ис": "Isa", "Иер": "Jer", "Дан": "Dan", "1 Езд": "Ezra", "Неем": "Neh", "Есф": "Esth",
  "Мф": "Matt", "Мк": "Mark", "Лк": "Luke", "Ин": "John", "Деян": "Acts",
};

const referencePattern = /^\s*((?:[1-4]\s*)?[А-ЯЁ][А-Яа-яЁё.]*)\s+(\d+):(\d+)(?:[–—-](?:(\d+):)?(\d+))?\s*$/u;

function extractVerses(book, chapterStart, verseStart, chapterEnd, verseEnd) {
  const verses = [];
  for (let chapter = chapterStart; chapter <= chapterEnd; chapter += 1) {
    const chapterVerses = book.chapters[chapter - 1] ?? [];
    const start = chapter === chapterStart ? verseStart : 1;
    const end = chapter === chapterEnd ? Math.min(verseEnd, chapterVerses.length) : chapterVerses.length;
    for (let verse = start; verse <= end; verse += 1) {
      const text = chapterVerses[verse - 1];
      if (text) verses.push({ chapter, verse, text });
    }
  }
  return verses;
}

function passagesFor(reference) {
  const passages = [];
  for (const display of reference.displayRu.split(";")) {
    const match = referencePattern.exec(display);
    if (!match) continue;
    const bookKey = match[1].replace(/\./g, "").replace(/\s+/g, " ").trim();
    const osis = bookOsisByDisplay[bookKey] ?? bookOsisById[reference.bookId];
    if (!commonCanonOsisSet.has(osis)) throw new Error(`Reference outside the shared 66-book canon: ${display.trim()}`);
    const book = books.get(osis);
    if (!book) continue;
    const chapterStart = Number(match[2]);
    const verseStart = Number(match[3]);
    const chapterEnd = Number(match[4] ?? chapterStart);
    const verseEnd = Number(match[5] ?? verseStart);
    const verses = extractVerses(book, chapterStart, verseStart, chapterEnd, verseEnd);
    if (verses.length) passages.push({ displayRu: display.trim(), verses });
  }
  return passages;
}

const passages = {};
const representedBooks = new Set();
for (const event of events) {
  for (const reference of event.scriptureReferences) {
    const osis = bookOsisById[reference.bookId];
    if (!commonCanonOsisSet.has(osis)) throw new Error(`Event outside the shared 66-book canon: ${event.id}`);
    representedBooks.add(osis);
    passages[reference.displayRu] = passagesFor(reference);
    if (!passages[reference.displayRu].length) throw new Error(`No Synodal text for ${event.id}: ${reference.displayRu}`);
  }
}

const output = {
  metadata: {
    translation: bible.translation,
    edition: bible.edition,
    license: bible.license,
    source: bible.source,
    canon: commonCanonMetadata.id,
    canonRu: commonCanonMetadata.titleRu,
    books: commonCanonMetadata.books,
    sourceBooks: bible.books.length,
    representedBooks: representedBooks.size,
  },
  passages,
};

await writeFile(resolve("data/synodal-passages.json"), JSON.stringify(output), "utf8");
console.log(`Wrote ${Object.keys(passages).length} referenced passages for ${events.length} events`);
