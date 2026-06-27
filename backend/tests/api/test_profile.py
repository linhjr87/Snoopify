import pytest

PATCH_BODY = {
    "display_name": "Minh",
    "username": "minh_dev",
    "level": "B2",
    "level_target": "C1",
    "goal_text": "Speak fluently at work",
    "daily_target": 30,
}


@pytest.mark.asyncio
async def test_patch_profile_updates_fields(auth_client):
    client, _ = auth_client
    res = await client.patch("/profile", json=PATCH_BODY)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["display_name"] == "Minh"
    assert body["username"] == "minh_dev"
    assert body["level"] == "B2"
    assert body["level_target"] == "C1"
    assert body["goal_text"] == "Speak fluently at work"
    assert body["daily_target"] == 30
    # level B2 unlocks the b2 achievement
    assert any(a["key"] == "b2" and a["earned"] for a in body["achievements"])


@pytest.mark.asyncio
async def test_patch_profile_keeping_own_username_is_ok(auth_client):
    client, _ = auth_client
    res = await client.patch("/profile", json={**PATCH_BODY, "username": "user_a"})
    assert res.status_code == 200, res.text


@pytest.mark.asyncio
async def test_patch_profile_rejects_invalid_level(auth_client):
    client, _ = auth_client
    res = await client.patch("/profile", json={**PATCH_BODY, "level": "Z9"})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_patch_profile_duplicate_username_is_409(client):
    # register a second user, then try to take their username from the first
    await client.post("/auth/register", json={"email": "a@example.com", "username": "user_a", "password": "s3cret!", "display_name": "A"})
    # second user in a separate client/session reusing the same app overrides
    await client.post("/auth/logout")
    await client.post("/auth/register", json={"email": "b@example.com", "username": "taken_name", "password": "s3cret!", "display_name": "B"})
    # now logged in as B; try to rename B to A's username
    res = await client.patch("/profile", json={**PATCH_BODY, "username": "user_a"})
    assert res.status_code == 409
    assert "username" in res.json()["detail"].lower()


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
