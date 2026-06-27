import pytest

REG = {"email": "a@example.com", "username": "alpha", "password": "s3cret!", "display_name": "A"}

@pytest.mark.asyncio
async def test_register_sets_cookie_and_me_returns_user(auth_client):
    client, user = auth_client
    assert user["email"] == "a@example.com"
    assert user["username"] == "user_a"
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
    dup_email = {**REG, "username": "alpha2"}
    assert (await client.post("/auth/register", json=dup_email)).status_code == 409

@pytest.mark.asyncio
async def test_duplicate_username_is_409(client):
    assert (await client.post("/auth/register", json=REG)).status_code == 201
    dup_user = {**REG, "email": "other@example.com"}
    res = await client.post("/auth/register", json=dup_user)
    assert res.status_code == 409
    assert "username" in res.json()["detail"].lower()

@pytest.mark.asyncio
async def test_username_is_lowercased(client):
    res = await client.post("/auth/register", json={**REG, "username": "MixedCase"})
    assert res.status_code == 201
    assert res.json()["username"] == "mixedcase"

@pytest.mark.asyncio
async def test_login_by_username(client):
    await client.post("/auth/register", json=REG)
    res = await client.post("/auth/login", json={"identifier": "alpha", "password": REG["password"]})
    assert res.status_code == 200
    assert res.json()["email"] == "a@example.com"

@pytest.mark.asyncio
async def test_login_by_email_still_works(client):
    await client.post("/auth/register", json=REG)
    res = await client.post("/auth/login", json={"identifier": REG["email"], "password": REG["password"]})
    assert res.status_code == 200

@pytest.mark.asyncio
async def test_login_wrong_password_is_401(client):
    await client.post("/auth/register", json=REG)
    res = await client.post("/auth/login", json={"identifier": REG["email"], "password": "wrong"})
    assert res.status_code == 401

@pytest.mark.asyncio
async def test_logout_clears_session(auth_client):
    client, _ = auth_client
    assert (await client.post("/auth/logout")).status_code == 204
    assert (await client.get("/auth/me")).status_code == 401

@pytest.mark.asyncio
async def test_login_unknown_identifier_is_401(client):
    res = await client.post("/auth/login", json={"identifier": "nobody@example.com", "password": "whatever"})
    assert res.status_code == 401
