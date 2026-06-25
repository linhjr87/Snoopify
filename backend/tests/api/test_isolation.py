import pytest

A = {"email": "a@example.com", "password": "pw1234", "display_name": "A"}
B = {"email": "b@example.com", "password": "pw1234", "display_name": "B"}


async def _register(client, who):
    # fresh cookie jar per client; register returns 201 + sets sid
    assert (await client.post("/auth/register", json=who)).status_code == 201


@pytest.mark.asyncio
async def test_user_a_cannot_see_or_touch_user_b_decks(client_factory):
    ca = await client_factory(); await _register(ca, A)
    cb = await client_factory(); await _register(cb, B)
    # B creates a deck
    deck = (await cb.post("/decks", json={"name": "B deck"})).json()
    # A lists decks: must NOT include B's
    a_list = (await ca.get("/decks")).json()
    assert all(d["id"] != deck["id"] for d in a_list)
    # A tries to read/update/delete B's deck → 404
    assert (await ca.get(f"/decks/{deck['id']}")).status_code == 404
    assert (await ca.patch(f"/decks/{deck['id']}", json={"name": "x"})).status_code == 404
    assert (await ca.delete(f"/decks/{deck['id']}")).status_code == 404


@pytest.mark.asyncio
async def test_register_seeds_a_starter_deck(auth_client):
    client, _ = auth_client
    decks = (await client.get("/decks")).json()
    assert len(decks) == 1 and decks[0]["count"] == 5
