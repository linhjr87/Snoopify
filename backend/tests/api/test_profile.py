import pytest


@pytest.mark.asyncio
async def test_get_profile_shape_for_fresh_user(auth_client):
    client, _ = auth_client
    res = await client.get("/profile")
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["username"] == "user_a"
    assert body["level"] == "B1"
    assert body["level_target"] == "B2"
    assert body["daily_target"] == 20
    # fresh user from auth_client has a seeded starter deck (5 new cards), no reviews
    assert body["stats"]["learned"] == 0
    assert body["stats"]["mastered"] == 0
    assert body["stats"]["streak"] == 0
    assert body["stats"]["accuracy"] == 0
    keys = [a["key"] for a in body["achievements"]]
    assert keys == ["streak7", "mastered100", "sessions10", "streak30", "mastered500", "b2"]
    assert all(a["earned"] is False for a in body["achievements"])


@pytest.mark.asyncio
async def test_get_profile_requires_auth(client):
    res = await client.get("/profile")
    assert res.status_code == 401
