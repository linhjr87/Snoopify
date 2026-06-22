import pytest_asyncio

CARDS = [
    {"word": "resilient", "meaning": "kiên cường", "example": "She is resilient today."},
    {"word": "serendipity", "meaning": "duyên may", "example": "Pure serendipity here."},
    {"word": "meticulous", "meaning": "tỉ mỉ", "example": "He is meticulous."},
    {"word": "ambiguous", "meaning": "mơ hồ", "example": "It was ambiguous."},
]


@pytest_asyncio.fixture
async def deck_with_cards(client):
    did = (await client.post("/decks", json={"name": "D", "topic": "t"})).json()["id"]
    for c in CARDS:
        await client.post(f"/decks/{did}/cards", json=c)
    return did


async def test_session_returns_due_cards_with_quiz_and_fill(client, deck_with_cards):
    r = await client.get("/review/session")
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 4  # all new cards are due immediately
    first = items[0]
    assert "quiz" in first and "fill" in first
    assert len(first["quiz"]["options"]) == 4
    keys = [o["key"] for o in first["quiz"]["options"]]
    assert first["quiz"]["correct_key"] in keys
