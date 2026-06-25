import pytest_asyncio


@pytest_asyncio.fixture
async def graded(auth_client):
    # grade one card from the per-user seeded starter deck
    client, _ = auth_client
    did = (await client.get("/decks")).json()[0]["id"]
    cid = (await client.get(f"/decks/{did}/cards")).json()[0]["id"]
    await client.post("/review/grade", json={"card_id": cid, "rating": "remember", "mode": "flash"})
    return cid


async def test_reset_clears_history_and_schedule_but_keeps_cards(auth_client, graded):
    client, _ = auth_client
    r = await client.post("/progress/reset")
    assert r.status_code == 200
    assert r.json()["reset"] == 5  # only this user's 5 starter cards

    # card still exists, schedule back to defaults, due again
    card = (await client.get(f"/cards/{graded}")).json()
    assert card["repetitions"] == 0
    assert card["interval_days"] == 0
    assert card["lapses"] == 0
    assert card["ease_factor"] == 2.5
    assert card["last_reviewed_at"] is None

    summary = (await client.get("/progress/summary")).json()
    assert summary["reviews_today"] == 0
    assert summary["due_total"] == 5
