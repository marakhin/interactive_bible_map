import type { Storyline } from "@/domain/types";
import { events } from "./events";

const story = (
  id: string,
  titleRu: string,
  descriptionRu: string,
  testament: Storyline["testament"],
  color: string,
  routeCertainty: Storyline["routeCertainty"] = "scriptural_sequence",
  importance: Storyline["importance"] = 4,
): Storyline => ({
  id,
  slug: id,
  titleRu,
  descriptionRu,
  testament,
  eventIds: events.filter((event) => event.storylineIds.includes(id)).map((event) => event.id),
  importance,
  routeCertainty,
  color,
});

export const storylines: Storyline[] = [
  story("beginnings", "Начало Бытия", "Первые главы Бытия без искусственной привязки к современной хронологии.", "OT", "#7b6b4b", "disputed", 5),
  story("abraham", "Путь Авраама", "От Ура и Харрана через Ханаан к Хеврону — в последовательности книги Бытия.", "OT", "#ba6437", "approximate", 5),
  story("isaac", "Исаак", "Ключевые места повествования об Исааке.", "OT", "#ad7749", "approximate"),
  story("jacob", "Путь Иакова", "Бегство в Харран и возвращение Иакова в землю отцов.", "OT", "#9a7040", "approximate"),
  story("joseph", "Иосиф и переселение в Египет", "Путь Иосифа и дома Иакова в Египет.", "OT", "#89623f", "approximate"),
  story("exodus", "Исход", "От Египта к Синаю и равнинам Моава. Маршрут показан как приблизительный и спорный.", "OT", "#c28838", "disputed", 5),
  story("conquest", "Иисус Навин и вступление в Ханаан", "Переход Иордана и ключевые события книги Иисуса Навина.", "OT", "#8e7d3c", "disputed"),
  story("judges", "Эпоха Судей", "Призвание судей и освобождение Израиля в повествовании книги Судей.", "OT", "#7f7442", "approximate"),
  story("david", "Самуил, Саул и Давид", "От Вифлеема и долины Ела к Хеврону и Иерусалиму.", "OT", "#a34f3f", "scriptural_sequence", 5),
  story("kingdom", "Царство и храм", "Соломонов храм и разделение царства.", "OT", "#775742"),
  story("prophets", "Пророки", "География служения Илии, Елисея, Ионы и Исаии.", "OT", "#6f6242"),
  story("exile", "Плен", "Падение Самарии и Иерусалима и путь к местам плена.", "OT", "#73615e", "scriptural_sequence", 5),
  story("return", "Возвращение", "От Вавилона и Суз к восстановлению Иерусалима.", "OT", "#7c6b42"),
  story("christ", "Жизнь и служение Иисуса Христа", "От Благовещения и Рождества до Воскресения Господа.", "NT", "#2f7180", "scriptural_sequence", 5),
  story("holy-week", "Страстная седмица", "События в Иерусалиме и Вифании от входа Господня до Воскресения.", "NT", "#9b3f45", "scriptural_sequence", 5),
  story("acts", "Начало апостольской проповеди", "От Вознесения и Пятидесятницы к распространению Благой вести.", "NT", "#3e748a"),
  story("paul-1", "Первое путешествие апостола Павла", "Антиохия, Кипр и города Малой Азии по Деян. 13–14.", "NT", "#397d8c", "scriptural_sequence", 5),
  story("paul-2", "Второе путешествие апостола Павла", "Из Антиохии через Малую Азию в Македонию и Грецию.", "NT", "#2f8791", "scriptural_sequence", 5),
  story("paul-3", "Третье путешествие апостола Павла", "Служение в Ефесе и возвращение в Иерусалим.", "NT", "#367686", "scriptural_sequence", 5),
  story("paul-rome", "Путешествие апостола Павла в Рим", "Из Кесарии через Средиземное море к Риму по Деян. 27–28.", "NT", "#276979", "scriptural_sequence", 5),
];

export const storylineById = new Map(storylines.map((line) => [line.id, line]));
