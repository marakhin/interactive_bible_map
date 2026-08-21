export type BiblicalRegionSource = {
  titleRu: string;
  roleRu: string;
  url: string;
  licenseRu: string;
};

export type BiblicalRegion = {
  id: string;
  nameRu: string;
  scripture: string;
  periodRu: string;
  noteRu: string;
  sourceNoteRu: string;
  sources: BiblicalRegionSource[];
  color: string;
  points: Array<[latitude: number, longitude: number]>;
  labelPoint: [latitude: number, longitude: number];
};

const schematicNote = "Граница показана схематично: Писание называет эту землю или область, но не задаёт её географический контур; пределы менялись в разные эпохи.";

const shepherdPalestine: BiblicalRegionSource = {
  titleRu: "У. Р. Шеперд, Reference Map of Ancient Palestine",
  roleRu: "историческая карта Палестины в Historical Atlas (1923; издание карты 1926)",
  url: "https://maps.lib.utexas.edu/maps/historical/history_shepherd_1923.html",
  licenseRu: "общественное достояние",
};

const shepherdOrient: BiblicalRegionSource = {
  titleRu: "У. Р. Шеперд, Historical Atlas: Древний Восток",
  roleRu: "карты Ассирийской державы и восточных царств для положения Египта и Месопотамии",
  url: "https://maps.lib.utexas.edu/maps/historical/history_shepherd_1923.html",
  licenseRu: "общественное достояние",
};

const smithHolyLand: BiblicalRegionSource = {
  titleRu: "Дж. А. Смит, The Historical Geography of the Holy Land",
  roleRu: "описание природных рубежей, областей западной и восточной Палестины",
  url: "https://www.loc.gov/item/30031769/",
  licenseRu: "общественное достояние; Библиотека Конгресса США",
};

const pleiades: BiblicalRegionSource = {
  titleRu: "Pleiades Gazetteer of Ancient Places",
  roleRu: "сверка положения древних областей и опорных мест; не источник готовых полигонов",
  url: "https://pleiades.stoa.org/help/using-pleiades-data",
  licenseRu: "CC BY 3.0",
};

const holyLandSources = [shepherdPalestine, smithHolyLand, pleiades];

export const biblicalRegions: BiblicalRegion[] = [
  {
    id: "egypt",
    nameRu: "Египет",
    scripture: "Исх. 12:40–41",
    periodRu: "земля, прямо названная в Писании",
    noteRu: schematicNote,
    sourceNoteRu: "Полигон сужен к историческому ядру Египта — дельте и долине Нила. Пустыни и политические владения разных династий намеренно не выдаются за единую постоянную границу.",
    sources: [shepherdOrient, pleiades],
    color: "#a36743",
    points: [[31.55, 29.35], [31.55, 30.55], [31.4, 31.65], [31.15, 32.7], [30.25, 32.55], [29.1, 32.05], [27.5, 32.8], [24.0, 32.25], [22.0, 31.8], [22.0, 29.45], [24.0, 30.25], [27.5, 30.35], [29.45, 30.1], [30.65, 29.15]],
    labelPoint: [27.2, 31.15],
  },
  {
    id: "canaan",
    nameRu: "земля Ханаанская",
    scripture: "Быт. 12:5–7; Чис. 34:1–12",
    periodRu: "ветхозаветное наименование земли",
    noteRu: schematicNote,
    sourceNoteRu: "Западный край следует Средиземному морю, восточный — долине Иордана; север и юг сведены по библейскому описанию Чис. 34 и историческим картам. Это учебное обобщение разных эпох.",
    sources: holyLandSources,
    color: "#8a744f",
    points: [[33.32, 35.05], [33.28, 35.52], [33.02, 35.66], [32.7, 35.62], [32.22, 35.58], [31.75, 35.5], [31.25, 35.43], [30.75, 35.2], [30.55, 34.85], [30.95, 34.45], [31.55, 34.38], [32.25, 34.57], [32.85, 34.92]],
    labelPoint: [31.72, 35.03],
  },
  {
    id: "mesopotamia",
    nameRu: "Месопотамия",
    scripture: "Деян. 2:9",
    periodRu: "обширная область между великими реками",
    noteRu: schematicNote,
    sourceNoteRu: "Контур следует широкой зоне между Евфратом и Тигром от верхнего междуречья к Нижней Месопотамии. Он не обозначает границу одного государства или одного века.",
    sources: [shepherdOrient, pleiades],
    color: "#756164",
    points: [[37.35, 38.05], [37.85, 39.9], [37.55, 41.65], [37.05, 43.1], [36.1, 44.25], [34.75, 45.15], [33.0, 46.15], [31.0, 47.75], [29.65, 47.65], [30.05, 45.15], [31.2, 43.25], [33.0, 41.3], [35.0, 39.35]],
    labelPoint: [33.8, 43.35],
  },
  {
    id: "galilee",
    nameRu: "Галилея",
    scripture: "Лк. 4:14–15",
    periodRu: "область новозаветного повествования",
    noteRu: schematicNote,
    sourceNoteRu: "Контур уточнён по Верхней и Нижней Галилее: от средиземноморского побережья и нагорий на севере до Изреельской долины, Иордана и моря Галилейского.",
    sources: holyLandSources,
    color: "#2f7180",
    points: [[33.12, 35.08], [33.23, 35.32], [33.18, 35.58], [32.98, 35.67], [32.72, 35.65], [32.57, 35.48], [32.55, 35.22], [32.65, 35.02], [32.9, 35.0]],
    labelPoint: [32.88, 35.34],
  },
  {
    id: "samaria",
    nameRu: "Самария",
    scripture: "Деян. 8:1",
    periodRu: "область новозаветного повествования",
    noteRu: schematicNote,
    sourceNoteRu: "Северный рубеж проведён по югу Изреельской долины, восточный — по долине Иордана, южный — севернее Иерусалима; побережье не включено в основной горный контур.",
    sources: holyLandSources,
    color: "#836b89",
    points: [[32.58, 35.05], [32.57, 35.32], [32.48, 35.56], [32.16, 35.55], [31.93, 35.42], [31.9, 35.14], [32.02, 34.96], [32.28, 34.88], [32.48, 34.94]],
    labelPoint: [32.23, 35.23],
  },
  {
    id: "judea",
    nameRu: "Иудея",
    scripture: "Лк. 3:1",
    periodRu: "область новозаветного повествования",
    noteRu: schematicNote,
    sourceNoteRu: "Контур охватывает Иерусалим, Иудейские горы, Иудейскую пустыню и западный берег Мёртвого моря; граница с Самарией и Идумеей менялась и показана ориентировочно.",
    sources: holyLandSources,
    color: "#a95b38",
    points: [[31.98, 34.92], [31.96, 35.25], [31.9, 35.48], [31.56, 35.58], [31.2, 35.55], [31.03, 35.3], [31.08, 34.86], [31.3, 34.58], [31.62, 34.52], [31.86, 34.68]],
    labelPoint: [31.53, 35.12],
  },
  {
    id: "idumea",
    nameRu: "Идумея",
    scripture: "Мк. 3:8",
    periodRu: "область новозаветного повествования",
    noteRu: schematicNote,
    sourceNoteRu: "Показана область к югу от Иудеи между окрестностями Вирсавии, Арадом и северным Негевом. Она не тождественна более древнему Едому восточнее Аравы.",
    sources: holyLandSources,
    color: "#a78345",
    points: [[31.22, 34.65], [31.2, 35.28], [31.02, 35.42], [30.72, 35.25], [30.45, 34.98], [30.48, 34.58], [30.78, 34.38], [31.02, 34.45]],
    labelPoint: [30.82, 34.9],
  },
  {
    id: "decapolis",
    nameRu: "Десятиградие",
    scripture: "Мк. 5:20",
    periodRu: "группа эллинистических городов новозаветной эпохи",
    noteRu: schematicNote,
    sourceNoteRu: "Десятиградие не было областью с одной устойчивой административной границей. Полигон показывает основную зону городов к востоку и юго-востоку от моря Галилейского; изолированные города не расширяют его искусственно.",
    sources: holyLandSources,
    color: "#4f7c68",
    points: [[33.08, 35.55], [33.25, 35.82], [33.05, 36.18], [32.62, 36.25], [32.12, 36.15], [31.72, 35.88], [31.92, 35.62], [32.35, 35.55], [32.72, 35.58]],
    labelPoint: [32.48, 35.88],
  },
  {
    id: "transjordan",
    nameRu: "Заиорданье",
    scripture: "Мф. 4:25",
    periodRu: "обобщённое обозначение земли к востоку от Иордана",
    noteRu: schematicNote,
    sourceNoteRu: "Контур следует восточному берегу долины Иордана и северо-восточному берегу Мёртвого моря. Это направление «за Иорданом», а не название единой провинции.",
    sources: holyLandSources,
    color: "#5d7894",
    points: [[32.55, 35.55], [32.48, 35.92], [32.1, 36.0], [31.65, 36.02], [31.08, 35.9], [30.9, 35.62], [31.18, 35.48], [31.72, 35.5], [32.18, 35.52]],
    labelPoint: [31.55, 35.76],
  },
  {
    id: "moab",
    nameRu: "Моав",
    scripture: "Чис. 22:1",
    periodRu: "ветхозаветная земля восточнее Мёртвого моря",
    noteRu: schematicNote,
    sourceNoteRu: "Западный край следует Мёртвому морю, северный ориентирован по долине Арнона и равнинам Моава; южный и восточный пределы показаны только как учебное приближение.",
    sources: holyLandSources,
    color: "#947341",
    points: [[31.78, 35.53], [31.75, 35.85], [31.55, 36.0], [31.22, 36.02], [30.82, 35.9], [30.78, 35.58], [31.02, 35.45], [31.42, 35.48]],
    labelPoint: [31.25, 35.72],
  },
];

export const biblicalRegionById = new Map(biblicalRegions.map((region) => [region.id, region]));
