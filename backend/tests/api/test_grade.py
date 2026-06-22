import pytest_asyncio


@pytest_asyncio.fixture
async def card_id(client):
    did = (await client.post("/decks", json={"name": "D", "topic": "t"})).json()["id"]
    return (await client.post(f"/decks/{did}/cards",
            json={"word": "resilient", "meaning": "kiên cường"})).json()["id"]


async def test_grade_remember_advances_schedule(client, card_id):
    r = await client.post("/review/grade",
                          json={"card_id": card_id, "rating": "remember", "mode": "flash"})
    assert r.status_code == 200
    body = r.json()
    assert body["repetitions"] == 1
    assert body["interval_days"] == 1
    # card is no longer due now (due_at moved into the future)
    s = await client.get("/review/session")
    assert all(item["card_id"] != card_id for item in s.json())


async def test_grade_forgot_increments_lapses(client, card_id):
    r = await client.post("/review/grade",
                          json={"card_id": card_id, "rating": "forgot", "mode": "quiz",
                                "is_correct": False})
    assert r.status_code == 200
    assert r.json()["lapses"] == 1
    assert r.json()["interval_days"] == 1


async def test_grade_missing_card_404(client):
    r = await client.post("/review/grade",
                          json={"card_id": "00000000-0000-0000-0000-000000000000",
                                "rating": "remember", "mode": "flash"})
    assert r.status_code == 404
