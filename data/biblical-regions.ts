export type BiblicalRegion = {
  id: string;
  nameRu: string;
  scripture: string;
  periodRu: string;
  noteRu: string;
  color: string;
  points: Array<[latitude: number, longitude: number]>;
  labelPoint: [latitude: number, longitude: number];
};

const schematicNote = "Граница показана схематично: Писание называет эту землю или область, но не задаёт её географический контур; пределы менялись в разные эпохи.";

export const biblicalRegions: BiblicalRegion[] = [
  {
    id: "egypt",
    nameRu: "Египет",
    scripture: "Исх. 12:40–41",
    periodRu: "земля, прямо названная в Писании",
    noteRu: schematicNote,
    color: "#a36743",
    points: [[31.65, 25.0], [31.45, 34.1], [29.2, 34.75], [27.7, 33.4], [24.0, 35.0], [22.0, 31.2], [24.2, 25.0], [29.3, 24.7]],
    labelPoint: [27.4, 30.6],
  },
  {
    id: "canaan",
    nameRu: "земля Ханаанская",
    scripture: "Быт. 12:5–7",
    periodRu: "ветхозаветное наименование земли",
    noteRu: schematicNote,
    color: "#8a744f",
    points: [[33.45, 34.75], [33.25, 35.85], [32.15, 36.0], [30.55, 35.55], [30.35, 34.4], [31.25, 34.25], [32.65, 34.55]],
    labelPoint: [31.75, 35.03],
  },
  {
    id: "mesopotamia",
    nameRu: "Месопотамия",
    scripture: "Деян. 2:9",
    periodRu: "обширная область между великими реками",
    noteRu: schematicNote,
    color: "#756164",
    points: [[37.7, 38.2], [37.5, 44.2], [35.7, 47.8], [31.0, 48.8], [29.7, 46.1], [31.8, 42.0], [35.0, 39.0]],
    labelPoint: [34.1, 43.7],
  },
  {
    id: "galilee",
    nameRu: "Галилея",
    scripture: "Лк. 4:14–15",
    periodRu: "область новозаветного повествования",
    noteRu: schematicNote,
    color: "#2f7180",
    points: [[33.15, 35.05], [33.18, 35.63], [32.87, 35.78], [32.58, 35.53], [32.57, 35.12], [32.82, 34.95]],
    labelPoint: [32.86, 35.38],
  },
  {
    id: "samaria",
    nameRu: "Самария",
    scripture: "Деян. 8:1",
    periodRu: "область новозаветного повествования",
    noteRu: schematicNote,
    color: "#836b89",
    points: [[32.58, 35.03], [32.57, 35.55], [32.22, 35.58], [31.84, 35.42], [31.87, 35.02], [32.18, 34.88]],
    labelPoint: [32.22, 35.24],
  },
  {
    id: "judea",
    nameRu: "Иудея",
    scripture: "Лк. 3:1",
    periodRu: "область новозаветного повествования",
    noteRu: schematicNote,
    color: "#a95b38",
    points: [[31.94, 34.86], [31.96, 35.5], [31.55, 35.58], [31.08, 35.42], [31.08, 34.7], [31.48, 34.5]],
    labelPoint: [31.53, 35.1],
  },
  {
    id: "idumea",
    nameRu: "Идумея",
    scripture: "Мк. 3:8",
    periodRu: "область новозаветного повествования",
    noteRu: schematicNote,
    color: "#a78345",
    points: [[31.25, 34.65], [31.22, 35.47], [30.42, 35.24], [30.4, 34.55], [30.83, 34.35]],
    labelPoint: [30.8, 34.91],
  },
  {
    id: "decapolis",
    nameRu: "Десятиградие",
    scripture: "Мк. 5:20",
    periodRu: "область новозаветного повествования",
    noteRu: schematicNote,
    color: "#4f7c68",
    points: [[33.18, 35.63], [33.05, 36.05], [32.28, 36.18], [31.72, 35.88], [31.95, 35.58], [32.72, 35.53]],
    labelPoint: [32.5, 35.82],
  },
  {
    id: "transjordan",
    nameRu: "Заиорданье",
    scripture: "Мф. 4:25",
    periodRu: "область к востоку от Иордана",
    noteRu: schematicNote,
    color: "#5d7894",
    points: [[32.35, 35.54], [32.25, 36.05], [31.02, 35.95], [30.9, 35.52], [31.45, 35.42]],
    labelPoint: [31.52, 35.72],
  },
  {
    id: "moab",
    nameRu: "Моав",
    scripture: "Чис. 22:1",
    periodRu: "ветхозаветная земля восточнее Мёртвого моря",
    noteRu: schematicNote,
    color: "#947341",
    points: [[31.75, 35.53], [31.75, 35.95], [30.82, 35.9], [30.8, 35.5], [31.2, 35.42]],
    labelPoint: [31.24, 35.69],
  },
];

export const biblicalRegionById = new Map(biblicalRegions.map((region) => [region.id, region]));
