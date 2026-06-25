import pytest
import pytest_asyncio


pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def deck_ctx(auth_client):
    client, _ = auth_client
    r = await client.post("/decks", json={"name": "Deck", "topic": "t"})
    return client, r.json()["id"]


async def test_add_list_get_update_delete_card(deck_ctx):
    client, deck_id = deck_ctx
    payload = {"word": "resilient", "phonetic": "/rɪ/", "pos": "adjective",
               "meaning": "kiên cường", "example": "She is resilient."}
    r = await client.post(f"/decks/{deck_id}/cards", json=payload)
    assert r.status_code == 201
    card = r.json()
    cid = card["id"]
    assert card["word"] == "resilient"
    assert card["ease_factor"] == 2.5

    r = await client.get(f"/decks/{deck_id}/cards")
    assert r.status_code == 200
    assert len(r.json()) == 1

    r = await client.patch(f"/cards/{cid}", json={"meaning": "có khả năng phục hồi"})
    assert r.status_code == 200
    assert r.json()["meaning"] == "có khả năng phục hồi"

    r = await client.delete(f"/cards/{cid}")
    assert r.status_code == 204
    r = await client.get(f"/cards/{cid}")
    assert r.status_code == 404


async def test_add_card_to_missing_deck_404(auth_client):
    client, _ = auth_client
    r = await client.post(
        "/decks/00000000-0000-0000-0000-000000000000/cards", json={"word": "x"}
    )
    assert r.status_code == 404
