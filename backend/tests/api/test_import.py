async def test_import_valid_deck(client):
    body = {"deck": "Business English", "topic": "chủ đề",
            "cards": [{"word": "resilient", "meaning": "kiên cường"},
                      {"meaning": "no word — filtered"}]}
    r = await client.post("/decks/import", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert data["deck"]["count"] == 1
    assert "Business English" in data["msg"]


async def test_import_invalid_returns_400_with_fe_message(client):
    r = await client.post("/decks/import", json={"cards": []})
    assert r.status_code == 400
    assert r.json()["ok"] is False
    assert "thiếu trường bắt buộc" in r.json()["msg"]
