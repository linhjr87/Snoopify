import pytest_asyncio


@pytest_asyncio.fixture
async def seeded(client):
    did = (await client.post("/decks", json={"name": "D", "topic": "t"})).json()["id"]
    ids = []
    for w, m in [("resilient", "kiên cường"), ("serendipity", "duyên may"),
                 ("meticulous", "tỉ mỉ"), ("ambiguous", "mơ hồ")]:
        ids.append((await client.post(f"/decks/{did}/cards",
                    json={"word": w, "meaning": m})).json()["id"])
    return ids


async def test_summary_reflects_grades(client, seeded):
    before = (await client.get("/progress/summary")).json()
    assert before["mastery"]["new"] == 4
    assert before["due_total"] == 4

    await client.post("/review/grade", json={"card_id": seeded[0], "rating": "remember", "mode": "flash"})
    after = (await client.get("/progress/summary")).json()
    assert after["reviews_today"] == 1
    assert after["streak"] >= 1
    assert after["mastery"]["new"] == 3
    assert len(after["weekly_bars"]) == 7


async def test_heatmap_has_126_cells(client, seeded):
    r = await client.get("/progress/heatmap")
    assert r.status_code == 200
    cells = r.json()["cells"]
    assert len(cells) == 126
    assert all(0 <= c <= 3 for c in cells)


async def test_needs_review_orders_by_lapses(client, seeded):
    await client.post("/review/grade", json={"card_id": seeded[1], "rating": "forgot", "mode": "quiz", "is_correct": False})
    r = await client.get("/progress/needs-review")
    assert r.status_code == 200
    items = r.json()
    assert items[0]["lapses"] >= 1


async def test_word_of_day_and_recent(client, seeded):
    assert (await client.get("/dashboard/word-of-day")).status_code == 200
    recent = (await client.get("/cards/recent")).json()
    assert len(recent) == 3


async def test_word_of_day_empty_db_returns_404(client):
    r = await client.get("/dashboard/word-of-day")
    assert r.status_code == 404
