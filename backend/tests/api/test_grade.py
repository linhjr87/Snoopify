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


async def test_grade_vague_grows_reps_without_lapse(client, card_id):
    # advance to reps=1 first, then a vague grade
    await client.post("/review/grade",
                      json={"card_id": card_id, "rating": "remember", "mode": "flash"})
    r = await client.post("/review/grade",
                          json={"card_id": card_id, "rating": "vague", "mode": "quiz",
                                "is_correct": False})
    assert r.status_code == 200
    body = r.json()
    assert body["repetitions"] == 2  # not reset
    assert body["lapses"] == 0  # vague is not a lapse
    assert body["ease_factor"] < 2.6  # q=3 lowers ease


async def test_grade_missing_card_404(client):
    r = await client.post("/review/grade",
                          json={"card_id": "00000000-0000-0000-0000-000000000000",
                                "rating": "remember", "mode": "flash"})
    assert r.status_code == 404
