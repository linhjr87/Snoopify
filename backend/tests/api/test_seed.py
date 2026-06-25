from app.seed import SEED_DECK_NAME, seed_starter_deck, split_phon


def test_split_phon_separates_phonetic_and_pos():
    assert split_phon("/rɪˈzɪl.i.ənt/ · adjective") == ("/rɪˈzɪl.i.ənt/", "adjective")
    assert split_phon("phrasal verb") == ("", "phrasal verb")


async def test_seed_starter_deck_creates_user_owned_deck(session):
    from sqlalchemy import select

    from app.db.models import Card, Deck, User

    user = User(email="seed@example.com", password_hash="x", display_name="Seed")
    session.add(user)
    await session.commit()
    await session.refresh(user)

    deck = await seed_starter_deck(session, user.id)
    assert deck.name == SEED_DECK_NAME
    assert deck.user_id == user.id

    decks = (
        await session.execute(select(Deck).where(Deck.user_id == user.id))
    ).scalars().all()
    assert len(decks) == 1
    cards = (
        await session.execute(select(Card).where(Card.deck_id == deck.id))
    ).scalars().all()
    assert len(cards) == 5
    assert any(c.word == "resilient" for c in cards)


async def test_register_yields_one_deck_with_five_cards(auth_client):
    client, _ = auth_client
    decks = (await client.get("/decks")).json()
    assert len(decks) == 1 and decks[0]["count"] == 5
