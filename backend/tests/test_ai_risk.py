def test_ai_risk_assessment_endpoint(client):
    payload = {
        "latitude": 20.82,
        "longitude": 87.21,
        "district": "Balasore",
        "active_hazard_type": "CYCLONE",
    }
    response = client.post("/api/v1/ai/risk-assessment", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert "composite_risk_score" in data
    assert 0.0 <= data["composite_risk_score"] <= 1.0
    assert data["severity_level"] in ["CRITICAL", "HIGH", "MODERATE", "LOW"]
    assert "hazard_breakdown" in data
    assert "top_contributing_factors" in data


def test_ai_prediction_endpoint(client):
    response = client.get("/api/v1/ai/prediction?hazard_type=CYCLONE&lat=20.82&lon=87.21&hours=24")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "trajectory" in body["data"]
    assert len(body["data"]["trajectory"]) > 0


def test_ai_recommendations_endpoint(client):
    response = client.get("/api/v1/ai/recommendations?risk_score=0.82&hazard_type=CYCLONE&district=Balasore")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["evacuation_mandated"] is True
    assert len(body["data"]["immediate_actions"]) > 0


def test_ai_explainability_endpoint(client):
    response = client.get("/api/v1/ai/explain?lat=20.82&lon=87.21&district=Balasore")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "shap_contributions" in body["data"]
    assert "summary" in body["data"]
