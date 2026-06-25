import pytest

REG = {"email": "a@example.com", "password": "s3cret!", "display_name": "A"}

@pytest.mark.asyncio
async def test_register_sets_cookie_and_me_returns_user(auth_client):
    client, user = auth_client
    assert user["email"] == "a@example.com"
    me = await client.get("/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "a@example.com"

@pytest.mark.asyncio
async def test_me_without_cookie_is_401(client):
    res = await client.get("/auth/me")
    assert res.status_code == 401

@pytest.mark.asyncio
async def test_duplicate_email_is_409(client):
    assert (await client.post("/auth/register", json=REG)).status_code == 201
    assert (await client.post("/auth/register", json=REG)).status_code == 409

@pytest.mark.asyncio
async def test_login_wrong_password_is_401(client):
    await client.post("/auth/register", json=REG)
    res = await client.post("/auth/login", json={"email": REG["email"], "password": "wrong"})
    assert res.status_code == 401

@pytest.mark.asyncio
async def test_logout_clears_session(auth_client):
    client, _ = auth_client
    assert (await client.post("/auth/logout")).status_code == 204
    assert (await client.get("/auth/me")).status_code == 401
