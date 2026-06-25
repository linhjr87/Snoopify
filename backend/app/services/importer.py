import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

from app.db.models import Card, Deck
from app.schemas.deck import DeckOut
from app.services.decks import _to_out

INVALID_MSG = "JSON không hợp lệ hoặc thiếu trường bắt buộc (deck, cards[].word)."


@dataclass
class ParsedCard:
    word: str
    phonetic: str
    pos: str
    meaning: str
    example: str


@dataclass
class ParsedDeck:
    name: str
    topic: str
    cards: list[ParsedCard]


def parse_import(data: dict) -> ParsedDeck:
    if not isinstance(data, dict):
        raise ValueError(INVALID_MSG)
    name = data.get("deck") or data.get("name")
    cards = data.get("cards")
    if not name or not isinstance(cards, list) or len(cards) == 0:
        raise ValueError(INVALID_MSG)
    clean: list[ParsedCard] = []
    for c in cards:
        if isinstance(c, dict) and c.get("word"):
            clean.append(
                ParsedCard(
                    word=str(c["word"]),
                    phonetic=c.get("phonetic") or "",
                    pos=c.get("pos") or "",
                    meaning=c.get("meaning") or "",
                    example=c.get("example") or "",
                )
            )
    if not clean:
        raise ValueError(INVALID_MSG)
    return ParsedDeck(name=str(name), topic=data.get("topic") or "", cards=clean)


async def import_deck(session, data: dict, user_id: uuid.UUID) -> DeckOut:
    parsed = parse_import(data)
    deck = Deck(name=parsed.name, topic=parsed.topic, user_id=user_id)
    for c in parsed.cards:
        deck.cards.append(
            Card(word=c.word, phonetic=c.phonetic, pos=c.pos, meaning=c.meaning, example=c.example)
        )
    session.add(deck)
    await session.commit()
    await session.refresh(deck, attribute_names=["cards"])
    return _to_out(deck, datetime.now(timezone.utc))
