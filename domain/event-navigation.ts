import { bibleBooks } from "@/data/books";
import { events } from "@/data/events";
import { storylines } from "@/data/storylines";
import type { TestamentFilter } from "./types";

type NavigationContext = {
  activeBookId?: string;
  activeStorylineId?: string;
  activeCharacterId?: string;
  activeLocationId?: string;
  testamentFilter: TestamentFilter;
};

export type EventNavigationTarget = {
  eventId: string;
  bookId?: string;
  storylineId?: string;
  collectionTitle?: string;
};

// Use the same event and collection order as the study navigator.
export function getEventNavigation(eventId: string, context: NavigationContext) {
  const event = events.find((item) => item.id === eventId);
  const { activeBookId, activeStorylineId, activeCharacterId, activeLocationId, testamentFilter } = context;
  const storyId = activeStorylineId ?? (!activeBookId && !activeCharacterId && !activeLocationId ? event?.storylineIds[0] : undefined);
  const collections = activeBookId
    ? bibleBooks.map((book) => ({ id: book.id, title: book.titleRu, eventIds: events.filter((item) => item.scriptureReferences.some((ref) => ref.bookId === book.id)).map((item) => item.id) }))
    : storyId ? storylines.map((story) => ({ id: story.id, title: story.titleRu, eventIds: story.eventIds })) : [];
  const collectionIndex = collections.findIndex((item) => item.id === (activeBookId ?? storyId));
  const collection = collections[collectionIndex];
  const sequence = collection?.eventIds ?? events.filter((item) =>
    (testamentFilter === "ALL" || item.testament === testamentFilter) &&
    (!activeCharacterId || item.characters.includes(activeCharacterId)) &&
    (!activeLocationId || item.locations.some((place) => place.locationId === activeLocationId)),
  ).map((item) => item.id);
  const index = sequence.indexOf(eventId);
  const target = (direction: -1 | 1): EventNavigationTarget | undefined => {
    if (index < 0) return undefined;
    const withinCollection = sequence[index + direction];
    if (withinCollection) return { eventId: withinCollection };
    if (!collection) return undefined;
    for (let cursor = collectionIndex + direction; cursor >= 0 && cursor < collections.length; cursor += direction) {
      const adjacent = collections[cursor];
      const adjacentEventId = direction === 1 ? adjacent.eventIds[0] : adjacent.eventIds.at(-1);
      if (adjacentEventId) return {
        eventId: adjacentEventId,
        ...(activeBookId ? { bookId: adjacent.id } : { storylineId: adjacent.id }),
        collectionTitle: adjacent.title,
      };
    }
    return undefined;
  };
  return { previous: target(-1), next: target(1), kind: activeBookId ? "book" : storyId ? "story" : "events" };
}
