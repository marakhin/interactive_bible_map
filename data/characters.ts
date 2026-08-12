import type { BibleCharacter } from "@/domain/types";

export const characters: BibleCharacter[] = [
  { id: "abraham", slug: "abraham", nameRu: "Авраам", descriptionRu: "Патриарх, призванный Богом выйти в землю, которую Он укажет.", testament: "OT" },
  { id: "isaac", slug: "isaac", nameRu: "Исаак", descriptionRu: "Сын Авраама и Сарры, наследник обетования.", testament: "OT" },
  { id: "jacob", slug: "jacob", nameRu: "Иаков", descriptionRu: "Патриарх, получивший имя Израиль.", testament: "OT" },
  { id: "joseph", slug: "joseph", nameRu: "Иосиф", descriptionRu: "Сын Иакова, через которого его семья была сохранена в Египте.", testament: "OT" },
  { id: "moses", slug: "moses", nameRu: "Моисей", descriptionRu: "Пророк и вождь исхода Израиля из Египта.", testament: "OT" },
  { id: "joshua", slug: "joshua", nameRu: "Иисус Навин", descriptionRu: "Преемник Моисея, введший Израиль через Иордан.", testament: "OT" },
  { id: "gideon", slug: "gideon", nameRu: "Гедеон", descriptionRu: "Судия Израиля, призванный освободить народ от Мадианитян.", testament: "OT" },
  { id: "samuel", slug: "samuel", nameRu: "Самуил", descriptionRu: "Пророк и судия Израиля.", testament: "OT" },
  { id: "saul", slug: "saul", nameRu: "Саул", descriptionRu: "Первый царь Израиля.", testament: "OT" },
  { id: "david", slug: "david", nameRu: "Давид", descriptionRu: "Царь Израиля, помазанник Господень и псалмопевец.", testament: "OT" },
  { id: "solomon", slug: "solomon", nameRu: "Соломон", descriptionRu: "Сын Давида, построивший храм в Иерусалиме.", testament: "OT" },
  { id: "elijah", slug: "elijah", nameRu: "Илия", descriptionRu: "Пророк, служивший во время царя Ахава.", testament: "OT" },
  { id: "elisha", slug: "elisha", nameRu: "Елисей", descriptionRu: "Пророк, принявший служение после Илии.", testament: "OT" },
  { id: "isaiah", slug: "isaiah", nameRu: "Исаия", descriptionRu: "Пророк в Иудее и Иерусалиме.", testament: "OT" },
  { id: "jeremiah", slug: "jeremiah", nameRu: "Иеремия", descriptionRu: "Пророк перед падением Иерусалима и во время него.", testament: "OT" },
  { id: "ezra", slug: "ezra", nameRu: "Ездра", descriptionRu: "Священник и книжник, пришедший из Вавилона в Иерусалим.", testament: "OT" },
  { id: "nehemiah", slug: "nehemiah", nameRu: "Неемия", descriptionRu: "Руководитель восстановления стен Иерусалима.", testament: "OT" },
  { id: "theotokos", slug: "theotokos", nameRu: "Пресвятая Богородица", descriptionRu: "Пресвятая Дева Мария, Матерь Господа Иисуса Христа.", testament: "NT" },
  { id: "john-baptist", slug: "john-baptist", nameRu: "Иоанн Креститель", descriptionRu: "Пророк и Предтеча Господень.", testament: "NT" },
  { id: "jesus-christ", slug: "jesus-christ", nameRu: "Иисус Христос", descriptionRu: "Господь Иисус Христос, Сын Божий, воплотившийся ради нашего спасения.", testament: "NT" },
  { id: "peter", slug: "peter", nameRu: "Апостол Пётр", descriptionRu: "Один из двенадцати апостолов Христовых.", testament: "NT" },
  { id: "paul", slug: "paul", nameRu: "Апостол Павел", descriptionRu: "Апостол язычников, чьи труды описаны в книге Деяний.", testament: "NT" },
  { id: "barnabas", slug: "barnabas", nameRu: "Апостол Варнава", descriptionRu: "Сотрудник апостола Павла в первом путешествии.", testament: "NT" },
];

export const characterById = new Map(characters.map((character) => [character.id, character]));
