"""Extract the public-domain 1876 Russian Synodal SWORD module to local JSON."""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOL = ROOT / ".pysword-tool"
MODULE = Path(r"C:\Users\MI\russyn1876-source")
OUTPUT = ROOT / "data" / "synodal-bible.json"

sys.path.insert(0, str(TOOL))
from pysword.modules import SwordModules  # noqa: E402


RU_TITLES = {
    "Gen": "Бытие", "Exod": "Исход", "Lev": "Левит", "Num": "Числа", "Deut": "Второзаконие",
    "Josh": "Иисус Навин", "Judg": "Судьи", "Ruth": "Руфь", "1Sam": "1-я Царств", "2Sam": "2-я Царств",
    "1Kgs": "3-я Царств", "2Kgs": "4-я Царств", "1Chr": "1-я Паралипоменон", "2Chr": "2-я Паралипоменон",
    "PrMan": "Молитва Манассии", "Ezra": "1-я Ездры", "Neh": "Неемия", "1Esd": "2-я Ездры",
    "Tob": "Товита", "Jdt": "Иудифи", "Esth": "Есфирь", "Job": "Иова", "Ps": "Псалтирь",
    "Prov": "Притчи Соломона", "Eccl": "Екклезиаст", "Song": "Песнь песней", "Wis": "Премудрость Соломона",
    "Sir": "Премудрость Иисуса, сына Сирахова", "Isa": "Исаия", "Jer": "Иеремия", "Lam": "Плач Иеремии",
    "EpJer": "Послание Иеремии", "Bar": "Варуха", "Ezek": "Иезекииль", "Dan": "Даниил", "Hos": "Осия",
    "Joel": "Иоиль", "Amos": "Амос", "Obad": "Авдий", "Jonah": "Иона", "Mic": "Михей", "Nah": "Наум",
    "Hab": "Аввакум", "Zeph": "Софония", "Hag": "Аггей", "Zech": "Захария", "Mal": "Малахия",
    "1Macc": "1-я Маккавейская", "2Macc": "2-я Маккавейская", "3Macc": "3-я Маккавейская", "2Esd": "3-я Ездры",
    "Matt": "От Матфея", "Mark": "От Марка", "Luke": "От Луки", "John": "От Иоанна", "Acts": "Деяния",
    "Jas": "Иакова", "1Pet": "1-е Петра", "2Pet": "2-е Петра", "1John": "1-е Иоанна", "2John": "2-е Иоанна",
    "3John": "3-е Иоанна", "Jude": "Иуды", "Rom": "К Римлянам", "1Cor": "1-е Коринфянам",
    "2Cor": "2-е Коринфянам", "Gal": "К Галатам", "Eph": "К Ефесянам", "Phil": "К Филиппийцам",
    "Col": "К Колоссянам", "1Thess": "1-е Фессалоникийцам", "2Thess": "2-е Фессалоникийцам",
    "1Tim": "1-е Тимофею", "2Tim": "2-е Тимофею", "Titus": "К Титу", "Phlm": "К Филимону",
    "Heb": "К Евреям", "Rev": "Откровение Иоанна Богослова",
}


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


modules = SwordModules(str(MODULE))
modules.parse_modules()
bible = modules.get_bible_from_module("russyn1876eb")

books = []
for testament, structures in bible.get_structure().get_books().items():
    for book in structures:
        chapters = []
        for chapter_number, verse_count in enumerate(book.chapter_lengths, start=1):
            verses = []
            for verse_number in range(1, verse_count + 1):
                text = normalize(bible.get(book.name, chapter_number, verse_number))
                verses.append(text)
            chapters.append(verses)
        books.append({
            "osis": book.osis_name,
            "titleRu": RU_TITLES[book.osis_name],
            "testament": testament.upper(),
            "chapters": chapters,
        })

payload = {
    "translation": "Синодальный перевод",
    "edition": "1876",
    "license": "Public Domain",
    "source": "https://ebible.org/find/details.php?id=russyn",
    "books": books,
}
OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"Wrote {len(books)} books to {OUTPUT} ({OUTPUT.stat().st_size} bytes)")
