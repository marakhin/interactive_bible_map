import { BibleCharacterSchema, BibleEventSchema, BibleLocationSchema, StorylineSchema, type BibleCharacter, type BibleEvent, type BibleLocation, type Storyline } from "@/domain/types";
import { characters } from "./characters";
import { events } from "./events";
import { locations } from "./locations";
import { storylines } from "./storylines";

export interface BibleDataRepository {
  getEvents(): Promise<BibleEvent[]>;
  getEvent(id: string): Promise<BibleEvent>;
  getLocations(): Promise<BibleLocation[]>;
  getCharacter(id: string): Promise<BibleCharacter>;
  getStoryline(id: string): Promise<Storyline>;
}

export function validateDataset() {
  const validated = {
    events: BibleEventSchema.array().parse(events),
    locations: BibleLocationSchema.array().parse(locations),
    characters: BibleCharacterSchema.array().parse(characters),
    storylines: StorylineSchema.array().parse(storylines),
  };
  const unique = (values: string[], label: string) => {
    if (new Set(values).size !== values.length) throw new Error(`Повторяющийся ${label}`);
  };
  unique(validated.events.map((item) => item.id), "event ID");
  unique(validated.locations.map((item) => item.id), "location ID");
  const locationIds = new Set(validated.locations.map((item) => item.id));
  const characterIds = new Set(validated.characters.map((item) => item.id));
  const storylineIds = new Set(validated.storylines.map((item) => item.id));
  for (const event of validated.events) {
    for (const location of event.locations) if (!locationIds.has(location.locationId)) throw new Error(`${event.id}: неизвестное место ${location.locationId}`);
    if (event.locations.length && event.locations.filter((location) => location.role === "main").length !== 1) throw new Error(`${event.id}: должно быть ровно одно основное место события`);
    for (const character of event.characters) if (!characterIds.has(character)) throw new Error(`${event.id}: неизвестный персонаж ${character}`);
    for (const storyline of event.storylineIds) if (!storylineIds.has(storyline)) throw new Error(`${event.id}: неизвестный сюжет ${storyline}`);
    if (event.chronology.startYear === 0 || event.chronology.endYear === 0) throw new Error(`${event.id}: нулевой год запрещён`);
  }
  const eventIds = new Set(validated.events.map((item) => item.id));
  for (const storyline of validated.storylines) for (const eventId of storyline.eventIds) if (!eventIds.has(eventId)) throw new Error(`${storyline.id}: неизвестное событие ${eventId}`);
  return validated;
}

const dataset = validateDataset();

export class LocalBibleDataRepository implements BibleDataRepository {
  async getEvents() { return dataset.events; }
  async getEvent(id: string) {
    const event = dataset.events.find((item) => item.id === id);
    if (!event) throw new Error(`Событие ${id} не найдено`);
    return event;
  }
  async getLocations() { return dataset.locations; }
  async getCharacter(id: string) {
    const character = dataset.characters.find((item) => item.id === id);
    if (!character) throw new Error(`Персонаж ${id} не найден`);
    return character;
  }
  async getStoryline(id: string) {
    const storyline = dataset.storylines.find((item) => item.id === id);
    if (!storyline) throw new Error(`Сюжет ${id} не найден`);
    return storyline;
  }
}

export const repository = new LocalBibleDataRepository();
