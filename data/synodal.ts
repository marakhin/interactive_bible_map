import corpus from "./synodal-passages.json";
import type { ScriptureReference } from "@/domain/types";

type Verse = {
  chapter: number;
  verse: number;
  text: string;
};

export type SynodalPassage = {
  displayRu: string;
  verses: Verse[];
};

const passages = corpus.passages as Record<string, SynodalPassage[]>;

export function getSynodalPassages(reference: ScriptureReference): SynodalPassage[] {
  return passages[reference.displayRu] ?? [];
}

export const synodalMetadata = corpus.metadata;
