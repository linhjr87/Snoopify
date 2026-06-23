import pytest


pytestmark = pytest.mark.asyncio


async def test_create_list_get_update_delete_deck(client):
    # create
    r = await client.post("/decks", json={"name": "Business", "topic": "chủ đề"})
    assert r.status_code == 201
    deck = r.json()
    did = deck["id"]
    assert deck["name"] == "Business"
    assert deck["count"] == 0
    assert deck["due_count"] == 0

    # list
    r = await client.get("/decks")
    assert r.status_code == 200
    assert len(r.json()) == 1

    # get detail
    r = await client.get(f"/decks/{did}")
    assert r.status_code == 200
    assert r.json()["cards"] == []

    # update
    r = await client.patch(f"/decks/{did}", json={"name": "Business English"})
    assert r.status_code == 200
    assert r.json()["name"] == "Business English"

    # delete
    r = await client.delete(f"/decks/{did}")
    assert r.status_code == 204
    r = await client.get(f"/decks/{did}")
    assert r.status_code == 404


async def test_get_missing_deck_404(client):
    r = await client.get("/decks/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404


async def test_update_deck_with_cards_preserves_count(client):
    # create a deck
    r = await client.post("/decks", json={"name": "Travel", "topic": "travel"})
    assert r.status_code == 201
    did = r.json()["id"]

    # add 2 cards
    card_payload_1 = {"word": "adventure", "phonetic": "/ədˈvɛntʃər/", "pos": "noun",
                      "meaning": "cuộc phiêu lưu", "example": "Life is an adventure."}
    card_payload_2 = {"word": "destination", "phonetic": "/ˌdɛstɪˈneɪʃən/", "pos": "noun",
                      "meaning": "điểm đến", "example": "Paris is a great destination."}
    r1 = await client.post(f"/decks/{did}/cards", json=card_payload_1)
    assert r1.status_code == 201
    r2 = await client.post(f"/decks/{did}/cards", json=card_payload_2)
    assert r2.status_code == 201

    # rename the deck
    r = await client.patch(f"/decks/{did}", json={"name": "Travel English"})
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "Travel English"
    assert body["count"] == 2


async def test_list_decks_includes_mastery_and_last_reviewed(client):
    r = await client.post("/decks", json={"name": "Mastery", "topic": "t"})
    did = r.json()["id"]
    # create response already carries the new fields
    assert r.json()["mastery_pct"] == 0.0
    assert r.json()["last_reviewed_at"] is None

    # one brand-new card: 1 card, 0 proficient -> 0.0%, never reviewed
    await client.post(f"/decks/{did}/cards", json={"word": "w"})
    r = await client.get("/decks")
    d = next(x for x in r.json() if x["id"] == did)
    assert d["count"] == 1
    assert d["mastery_pct"] == 0.0
    assert d["last_reviewed_at"] is None
