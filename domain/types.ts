import { z } from "zod";

export const TestamentSchema = z.enum(["OT", "NT"]);
export const ChronologySchema = z.object({
  type: z.enum(["exact", "approximate", "range", "relative", "unknown"]),
  startYear: z.number().int().optional(),
  endYear: z.number().int().optional(),
  displayRu: z.string().min(1),
  certainty: z.enum(["high", "medium", "low", "disputed"]),
  noteRu: z.string().optional(),
});

export const ScriptureReferenceSchema = z.object({
  testament: TestamentSchema,
  bookId: z.string().min(1),
  bookRu: z.string().min(1),
  chapterStart: z.number().int().positive(),
  verseStart: z.number().int().positive().optional(),
  chapterEnd: z.number().int().positive().optional(),
  verseEnd: z.number().int().positive().optional(),
  displayRu: z.string().min(1),
});

export const EventLocationSchema = z.object({
  locationId: z.string().min(1),
  role: z.enum(["main", "origin", "destination", "route_point", "region"]),
  order: z.number().int().optional(),
});

export const BibleEventSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  titleRu: z.string().min(1),
  shortTitleRu: z.string().optional(),
  scriptureSummary: z.string().min(1),
  historicalNote: z.string().optional(),
  traditionNote: z.string().optional(),
  evidenceType: z.enum([
    "scripture_explicit",
    "scripture_inferred",
    "church_tradition",
    "historical_reconstruction",
  ]),
  testament: TestamentSchema,
  category: z.array(z.string()).min(1),
  importance: z.number().int().min(1).max(5),
  chronology: ChronologySchema,
  locations: z.array(EventLocationSchema),
  characters: z.array(z.string()),
  scriptureReferences: z.array(ScriptureReferenceSchema).min(1),
  storylineIds: z.array(z.string()),
  tags: z.array(z.string()).optional(),
});

export const BibleLocationSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  ancientNameRu: z.string().min(1),
  modernNameRu: z.string().optional(),
  alternativeNamesRu: z.array(z.string()).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  localizationType: z.enum(["identified", "probable", "traditional", "disputed", "unknown"]),
  localizationNoteRu: z.string().optional(),
  modernCountry: z.string().optional(),
  importance: z.number().int().min(1).max(5),
});

export const BibleCharacterSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  nameRu: z.string().min(1),
  descriptionRu: z.string().min(1),
  testament: TestamentSchema,
});

export const StorylineSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  titleRu: z.string().min(1),
  descriptionRu: z.string().min(1),
  testament: TestamentSchema,
  eventIds: z.array(z.string()).min(1),
  importance: z.number().int().min(1).max(5),
  routeCertainty: z.enum(["scriptural_sequence", "approximate", "disputed"]),
  color: z.string(),
});

export type Testament = z.infer<typeof TestamentSchema>;
export type Chronology = z.infer<typeof ChronologySchema>;
export type ScriptureReference = z.infer<typeof ScriptureReferenceSchema>;
export type BibleEvent = z.infer<typeof BibleEventSchema>;
export type BibleLocation = z.infer<typeof BibleLocationSchema>;
export type BibleCharacter = z.infer<typeof BibleCharacterSchema>;
export type Storyline = z.infer<typeof StorylineSchema>;

export type TestamentFilter = "ALL" | Testament;

export const localizationLabels: Record<BibleLocation["localizationType"], string> = {
  identified: "Место известно",
  probable: "Вероятная локализация",
  traditional: "Традиционная локализация",
  disputed: "Локализация спорна",
  unknown: "Точное место неизвестно",
};

export const chronologyLabels: Record<Chronology["certainty"], string> = {
  high: "Дата достаточно определённая",
  medium: "Приблизительная датировка",
  low: "Широкий диапазон",
  disputed: "Датировка спорна",
};
