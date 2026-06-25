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


@pytest.mark.asyncio
async def test_grade_foreign_card_is_404(client_factory):
    ca = await client_factory(); await _register(ca, A)
    cb = await client_factory(); await _register(cb, B)
    b_deck = (await cb.get("/decks")).json()[0]               # B's starter deck
    b_card = (await cb.get(f"/decks/{b_deck['id']}/cards")).json()[0]
    res = await ca.post("/review/grade", json={
        "card_id": b_card["id"], "rating": "remember", "mode": "flash", "is_correct": None})
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_progress_summary_counts_only_own_cards(client_factory):
    ca = await client_factory(); await _register(ca, A)
    s = (await ca.get("/progress/summary")).json()
    # A's starter deck has 5 cards, all new/due; summary reflects only A's data
    assert s["due_total"] == 5
