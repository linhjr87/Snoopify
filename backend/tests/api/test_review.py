async def test_session_returns_due_cards_with_quiz_and_fill(auth_client):
    client, _ = auth_client
    r = await client.get("/review/session")
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 5  # all 5 starter cards are new and due immediately
    first = items[0]
    assert "quiz" in first and "fill" in first
    assert len(first["quiz"]["options"]) == 4
    keys = [o["key"] for o in first["quiz"]["options"]]
    assert first["quiz"]["correct_key"] in keys


async def test_session_empty_when_all_cards_graded(auth_client):
    client, _ = auth_client
    for item in (await client.get("/review/session")).json():
        await client.post("/review/grade",
                          json={"card_id": item["card_id"], "rating": "remember", "mode": "flash"})
    r = await client.get("/review/session")
    assert r.status_code == 200
    assert r.json() == []  # nothing due, not an error


async def test_session_nonexistent_deck_404(auth_client):
    client, _ = auth_client
    r = await client.get("/review/session?deck_id=00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404  # bogus deck is distinguishable from "no cards due"
