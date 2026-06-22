from app.seed import SEED_DECK_NAME, seed, split_phon


def test_split_phon_separates_phonetic_and_pos():
    assert split_phon("/rɪˈzɪl.i.ənt/ · adjective") == ("/rɪˈzɪl.i.ənt/", "adjective")
    assert split_phon("phrasal verb") == ("", "phrasal verb")


async def test_seed_is_idempotent_and_creates_starter_deck(session):
    assert await seed(session) is True
    assert await seed(session) is False  # second run skips

    from sqlalchemy import select

    from app.db.models import Card, Deck

    decks = (await session.execute(select(Deck).where(Deck.name == SEED_DECK_NAME))).scalars().all()
    assert len(decks) == 1
    cards = (await session.execute(select(Card))).scalars().all()
    assert len(cards) == 5
    assert any(c.word == "resilient" for c in cards)
