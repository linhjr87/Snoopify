import uuid

from app.db.models import Card, Deck

SEED_DECK_NAME = "Bộ thẻ khởi động"
SEED_DECK_TOPIC = "từ vựng"

# Ported from frontend src/data/seed.ts SESSION (word, phon, meaning, example).
SEED_CARDS = [
    {"word": "resilient", "phon": "/rɪˈzɪl.i.ənt/ · adjective",
     "meaning": "có khả năng phục hồi nhanh; kiên cường",
     "example": "She is so resilient — she bounced back within a week."},
    {"word": "serendipity", "phon": "/ˌser.ənˈdɪp.ə.ti/ · noun",
     "meaning": "sự tình cờ may mắn; duyên may bất ngờ",
     "example": "Finding that little café was pure serendipity."},
    {"word": "meticulous", "phon": "/məˈtɪk.jə.ləs/ · adjective",
     "meaning": "tỉ mỉ, kỹ lưỡng, cẩn thận",
     "example": "He kept meticulous records of every transaction."},
    {"word": "ambiguous", "phon": "/æmˈbɪɡ.ju.əs/ · adjective",
     "meaning": "mơ hồ, nước đôi, đa nghĩa",
     "example": "The instructions were ambiguous and confusing."},
    {"word": "to put off", "phon": "phrasal verb",
     "meaning": "trì hoãn, hoãn lại",
     "example": "Don't put off until tomorrow what you can do today."},
]


def split_phon(phon: str) -> tuple[str, str]:
    if " · " in phon:
        phonetic, pos = phon.split(" · ", 1)
        return phonetic.strip(), pos.strip()
    return "", phon.strip()


async def seed_starter_deck(session, user_id: uuid.UUID) -> Deck:
    deck = Deck(name=SEED_DECK_NAME, topic=SEED_DECK_TOPIC, user_id=user_id)
    for item in SEED_CARDS:
        phonetic, pos = split_phon(item["phon"])
        deck.cards.append(
            Card(
                word=item["word"],
                phonetic=phonetic,
                pos=pos,
                meaning=item["meaning"],
                example=item["example"],
            )
        )
    session.add(deck)
    await session.commit()
    await session.refresh(deck, attribute_names=["cards"])
    return deck
