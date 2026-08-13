import { events } from "./events";
import type { Testament } from "@/domain/types";

export type BibleBookOption = {
  id: string;
  titleRu: string;
  testament: Testament;
  eventCount: number;
  placeCount: number;
};

const collected = new Map<string, { titleRu: string; testament: Testament; eventIds: Set<string>; locationIds: Set<string> }>();

for (const event of events) {
  for (const reference of event.scriptureReferences) {
    const book = collected.get(reference.bookId) ?? {
      titleRu: reference.bookRu,
      testament: reference.testament,
      eventIds: new Set<string>(),
      locationIds: new Set<string>(),
    };
    book.eventIds.add(event.id);
    for (const place of event.locations) book.locationIds.add(place.locationId);
    collected.set(reference.bookId, book);
  }
}

export const bibleBooks: BibleBookOption[] = [...collected.entries()].map(([id, book]) => ({
  id,
  titleRu: book.titleRu,
  testament: book.testament,
  eventCount: book.eventIds.size,
  placeCount: book.locationIds.size,
}));

export const bibleBookById = new Map(bibleBooks.map((book) => [book.id, book]));
