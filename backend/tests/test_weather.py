def test_get_radar_tiles(client):
    response = client.get("/api/v1/weather/radar-tiles")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "tileUrlTemplate" in body["data"]
    assert "mausam.imd.gov.in" in body["data"]["tileUrlTemplate"]


def test_get_current_weather_valid_coords(client):
    response = client.get("/api/v1/weather/current?lat=21.468&lon=87.014")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert "temperature_c" in data
    assert "wind_speed_kmh" in data
    assert "imd_warning_color" in data
    assert data["imd_warning_color"] in ["Red", "Orange", "Yellow", "Green"]


def test_get_imd_bulletin(client):
    response = client.get("/api/v1/weather/imd-bulletin?district_code=BALASORE")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["district_code"] == "BALASORE"
