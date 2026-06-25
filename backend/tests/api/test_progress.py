import pytest_asyncio


@pytest_asyncio.fixture
async def seeded(auth_client):
    # the per-user starter deck already holds 5 new cards; expose their ids
    client, _ = auth_client
    did = (await client.get("/decks")).json()[0]["id"]
    cards = (await client.get(f"/decks/{did}/cards")).json()
    return [c["id"] for c in cards]


async def test_summary_reflects_grades(auth_client, seeded):
    client, _ = auth_client
    before = (await client.get("/progress/summary")).json()
    assert before["mastery"]["new"] == 5
    assert before["due_total"] == 5

    await client.post("/review/grade", json={"card_id": seeded[0], "rating": "remember", "mode": "flash"})
    after = (await client.get("/progress/summary")).json()
    assert after["reviews_today"] == 1
    assert after["streak"] >= 1
    assert after["mastery"]["new"] == 4
    assert len(after["weekly_bars"]) == 7


async def test_heatmap_has_126_cells(auth_client, seeded):
    client, _ = auth_client
    r = await client.get("/progress/heatmap")
    assert r.status_code == 200
    cells = r.json()["cells"]
    assert len(cells) == 126
    assert all(0 <= c <= 3 for c in cells)


async def test_needs_review_orders_by_lapses(auth_client, seeded):
    client, _ = auth_client
    await client.post("/review/grade", json={"card_id": seeded[1], "rating": "forgot", "mode": "quiz", "is_correct": False})
    r = await client.get("/progress/needs-review")
    assert r.status_code == 200
    items = r.json()
    assert items[0]["lapses"] >= 1


async def test_word_of_day_and_recent(auth_client, seeded):
    client, _ = auth_client
    assert (await client.get("/dashboard/word-of-day")).status_code == 200
    recent = (await client.get("/cards/recent")).json()
    assert len(recent) == 3


async def test_word_of_day_empty_db_returns_404(client_factory):
    # a user with no cards: register, delete the seeded deck, expect 404
    from tests.api.test_isolation import A, _register
    c = await client_factory()
    await _register(c, A)
    did = (await c.get("/decks")).json()[0]["id"]
    await c.delete(f"/decks/{did}")
    r = await c.get("/dashboard/word-of-day")
    assert r.status_code == 404
