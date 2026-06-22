import pytest_asyncio


@pytest_asyncio.fixture
async def graded(client):
    did = (await client.post("/decks", json={"name": "D", "topic": "t"})).json()["id"]
    cid = (await client.post(f"/decks/{did}/cards",
           json={"word": "resilient", "meaning": "kiên cường"})).json()["id"]
    await client.post("/review/grade", json={"card_id": cid, "rating": "remember", "mode": "flash"})
    return cid


async def test_reset_clears_history_and_schedule_but_keeps_cards(client, graded):
    r = await client.post("/progress/reset")
    assert r.status_code == 200

    # card still exists, schedule back to defaults, due again
    card = (await client.get(f"/cards/{graded}")).json()
    assert card["repetitions"] == 0
    assert card["interval_days"] == 0
    assert card["lapses"] == 0
    assert card["ease_factor"] == 2.5
    assert card["last_reviewed_at"] is None

    summary = (await client.get("/progress/summary")).json()
    assert summary["reviews_today"] == 0
    assert summary["due_total"] == 1
