"""Integration tests for FastAPI endpoints."""

from app.models.user import UserRole


def test_health_check(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"


def test_user_registration_and_login(client):
    # Register
    reg_payload = {
        "email": "testuser@aicte.edu",
        "password": "Password123!",
        "full_name": "Test Officer",
        "role": "scrutiny",
    }
    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 201
    assert res.json()["email"] == "testuser@aicte.edu"

    # Login
    login_res = client.post(
        "/api/auth/login",
        data={"username": "testuser@aicte.edu", "password": "Password123!"},
    )
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
