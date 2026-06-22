from sqlalchemy import select

from app.db.models import Card, Deck


async def test_deck_card_roundtrip_and_defaults(session):
    deck = Deck(name="Test", topic="từ vựng")
    deck.cards.append(Card(word="resilient", meaning="kiên cường"))
    session.add(deck)
    await session.commit()

    loaded = (await session.execute(select(Deck))).scalars().one()
    assert loaded.id is not None
    assert len(loaded.cards) == 1
    card = loaded.cards[0]
    assert card.ease_factor == 2.5
    assert card.interval_days == 0
    assert card.repetitions == 0
    assert card.lapses == 0
    assert card.due_at is not None  # server default now()
