def test_reverse_geocoding(client):
    response = client.get("/api/v1/geocoding/reverse?lat=28.665&lon=77.242")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "district" in body["data"]
    assert "formatted_address" in body["data"]


def test_location_search(client):
    response = client.get("/api/v1/geocoding/search?q=Delhi")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert len(body["data"]) > 0


def test_gis_hazards(client):
    response = client.get("/api/v1/gis/hazards")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert len(body["data"]) > 0
    assert "coordinates" in body["data"][0]


def test_evacuation_routing(client):
    payload = {
        "origin": {"latitude": 21.468, "longitude": 87.014},
        "destination": {"latitude": 21.493, "longitude": 86.932},
    }
    response = client.post("/api/v1/gis/routing/evacuation", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "primary_route" in body["data"]
    route = body["data"]["primary_route"]
    assert route["distance_km"] > 0
    assert len(route["polyline_coordinates"]) > 0
