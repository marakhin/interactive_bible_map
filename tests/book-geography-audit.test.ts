import { describe, expect, it } from "vitest";
import { bibleBooks } from "@/data/books";
import { events, eventById } from "@/data/events";
import { locationById } from "@/data/locations";
import { getPrimaryEventLocation } from "@/domain/event-locations";

const auditedWaypointsByBook: Record<string, string[]> = {
  genesis: ["ark-ararat", "terah-leaves-ur", "abraham-shechem", "jacob-goshen"],
  exodus: ["moses-midian", "exodus-departure", "exodus-etham", "sea-crossing", "manna-wilderness-sin", "water-rephidim", "sinai-covenant"],
  numbers: ["spies-canaan", "kadesh-meribah", "aaron-mount-hor", "sihon-og", "moab-plains"],
  deuteronomy: ["moses-addresses-moab", "moses-nebo"],
  joshua: ["jordan-crossing", "jericho-fall", "ai-capture", "joshua-gibeon", "joshua-hazor", "tabernacle-shiloh", "covenant-shechem"],
  judges: ["ehud-moab", "deborah-barak", "gideon-call", "jephthah-gilead", "samson-gaza"],
  "1-samuel": ["samuel-called", "ark-philistines", "saul-anointed", "david-anointed", "david-goliath", "david-flees", "saul-endor"],
  "2-samuel": ["david-hebron-king", "david-jerusalem", "ark-jerusalem", "david-covenant"],
  "1-kings": ["solomon-gibeon", "solomon-temple", "kingdom-divides", "elijah-zarephath", "elijah-carmel", "elijah-horeb"],
  "2-kings": ["elijah-ascension", "elisha-shunem", "elisha-naaman", "samaria-falls", "hezekiah-deliverance", "jerusalem-falls"],
  jonah: ["jonah-flight", "jonah-nineveh"],
  isaiah: ["isaiah-called", "hezekiah-deliverance"],
  jeremiah: ["jeremiah-called", "jeremiah-egypt"],
  daniel: ["daniel-babylon", "daniel-lions"],
  ezra: ["return-decree", "second-temple", "ezra-arrives"],
  esther: ["esther-susa"],
  nehemiah: ["nehemiah-walls"],
  matthew: ["nativity", "magi-bethlehem", "flight-egypt", "baptism-christ", "temptation-christ", "capernaum-ministry", "sermon-mount", "gadarene-healing", "feeding-five-thousand", "gennesaret-healings", "tyre-sidon-ministry", "peter-confession", "transfiguration", "jericho-blind", "entry-jerusalem", "crucifixion", "resurrection", "galilee-appearance"],
  mark: ["baptism-christ", "temptation-christ", "capernaum-ministry", "storm-calmed", "gadarene-healing", "nazareth-rejection", "feeding-five-thousand", "gennesaret-healings", "tyre-sidon-ministry", "decapolis-healing", "bethsaida-blind-man", "peter-confession", "transfiguration", "jericho-blind", "entry-jerusalem", "crucifixion", "resurrection", "galilee-appearance", "ascension"],
  luke: ["annunciation", "visitation", "nativity", "presentation", "baptism-christ", "temptation-christ", "return-galilee", "nazareth-synagogue", "capernaum-ministry", "miraculous-catch", "luke-sermon-plain", "nain-widow", "gadarene-healing", "feeding-five-thousand", "peter-confession", "transfiguration", "jericho-blind", "zacchaeus", "entry-jerusalem", "crucifixion", "resurrection", "emmaus", "ascension"],
  john: ["john-baptizes-bethany", "cana-wedding", "first-temple-cleansing", "sychar-samaritan-woman", "royal-official-son", "bethesda-healing", "feeding-five-thousand", "blind-siloam", "beyond-jordan-ministry", "lazarus-raised", "ephraim-retreat", "entry-jerusalem", "crucifixion", "resurrection", "tiberias-appearance"],
  acts: ["ascension", "pentecost", "gospel-samaria", "philip-gaza-road", "paul-conversion", "peter-lydda-joppa", "peter-cornelius", "antioch-disciples", "paul1-cyprus", "paul1-asia", "apostolic-council", "paul2-macedonia", "paul2-greece", "paul3-ephesus", "paul3-miletus", "paul-caesarea", "paul-voyage", "paul-rome"],
};

describe("аудит географических ориентиров по книгам", () => {
  it("охватывает каждую представленную в интерфейсе книгу", () => {
    expect(Object.keys(auditedWaypointsByBook).sort()).toEqual(bibleBooks.map((book) => book.id).sort());
  });

  it("сохраняет проверенные ориентиры в порядке текста каждой книги", () => {
    for (const [bookId, expectedIds] of Object.entries(auditedWaypointsByBook)) {
      const actualIds = events
        .filter((event) => event.scriptureReferences.some((reference) => reference.bookId === bookId))
        .map((event) => event.id)
        .filter((eventId) => expectedIds.includes(eventId));
      expect(actualIds, bookId).toEqual(expectedIds);
    }
  });

  it("привязывает каждый проверенный ориентир к координате и к самой книге", () => {
    for (const [bookId, eventIds] of Object.entries(auditedWaypointsByBook)) {
      for (const eventId of eventIds) {
        const event = eventById.get(eventId);
        expect(event, `${bookId}: ${eventId}`).toBeDefined();
        expect(event?.scriptureReferences.some((reference) => reference.bookId === bookId), `${bookId}: ${eventId}`).toBe(true);
        const location = event ? getPrimaryEventLocation(event, locationById) : undefined;
        expect(location?.latitude, `${bookId}: ${eventId}`).toEqual(expect.any(Number));
        expect(location?.longitude, `${bookId}: ${eventId}`).toEqual(expect.any(Number));
      }
    }
  });

  it("разбирает диапазоны стихов Ветхого и Нового Заветов, а не только первый стих", () => {
    for (const event of events) {
      for (const reference of event.scriptureReferences) {
        if (!/[–—-]/u.test(reference.displayRu)) continue;
        expect(reference.verseEnd, `${event.id}: ${reference.displayRu}`).toEqual(expect.any(Number));
      }
    }
  });
});
