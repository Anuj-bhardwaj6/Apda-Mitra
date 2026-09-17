def test_health_check_endpoint(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200

    data = response.json()
    assert "success" in data
    assert "message" in data
    assert "data" in data
    assert "timestamp" in data
    assert "requestId" in data

    # Verify custom security and timing middleware headers
    assert "x-request-id" in response.headers
    assert "x-process-time" in response.headers
    assert response.headers["x-content-type-options"] == "nosniff"


def test_root_redirect(client):
    response = client.get("/", follow_redirects=False)
    assert response.status_code in [302, 307]
    assert response.headers["location"] == "/docs"
