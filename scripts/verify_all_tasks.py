#!/usr/bin/env python3
"""
Apda Mitra - Full End-to-End Automated API Verification Suite
Verifies all 9 Weather, Climate, Hazard, Flood, Air Quality, Elevation, and Geocoding endpoints.
"""

import sys
import json
import urllib.request

BASE_URL = "http://127.0.0.1:8000/api/v1"

TEST_ENDPOINTS = [
    ("/weather/current?latitude=11.6854&longitude=76.1320", "Current Weather & Conditions"),
    ("/weather/forecast?latitude=11.6854&longitude=76.1320", "Hourly & Daily Multi-Day Forecast"),
    ("/flood/forecast?latitude=11.6854&longitude=76.1320", "Flood Forecast & Runoff Telemetry"),
    ("/air-quality/current?latitude=11.6854&longitude=76.1320", "Air Quality Index & Pollutants"),
    ("/elevation/profile?latitude=11.6854&longitude=76.1320", "Topographical Elevation & Slope"),
    ("/weather/historical?latitude=11.6854&longitude=76.1320&lookback_days=14", "Historical Rainfall (14 Days)"),
    ("/weather/ensemble?latitude=11.6854&longitude=76.1320&models=icon_seamless", "Multi-Model Ensemble Forecast"),
    ("/hazard/risk-analysis?latitude=11.6854&longitude=76.1320", "Disaster Risk Analysis & Factor Weights"),
    ("/geocoding/reverse?latitude=11.6854&longitude=76.1320", "Reverse Geocoding (OSM Nominatim)"),
]

def run_suite():
    print("=" * 70)
    print(" Apda Mitra: Testing Live Endpoints against", BASE_URL)
    print("=" * 70)
    
    passed = 0
    failed = 0
    
    for ep_path, label in TEST_ENDPOINTS:
        url = BASE_URL + ep_path
        ep_short = ep_path.split("?")[0]
        try:
            req = urllib.request.Request(
                url,
                headers={"Origin": "http://localhost:3000", "User-Agent": "ApdaMitraVerification/1.0"}
            )
            with urllib.request.urlopen(req, timeout=12) as response:
                status = response.status
                data = json.loads(response.read().decode("utf-8"))
                cors_origin = response.headers.get("Access-Control-Allow-Origin", "None")
                print(f" [PASS] HTTP {status} | {ep_short:<28} | {label}")
                passed += 1
        except Exception as e:
            print(f" [FAIL] ERR      | {ep_short:<28} | {label} -> {e}")
            failed += 1
            
    print("=" * 70)
    print(f"Results: {passed} PASSED, {failed} FAILED (Total: {len(TEST_ENDPOINTS)})")
    print("=" * 70)
    
    if failed > 0:
        sys.exit(1)
    print("ALL API ENDPOINTS VERIFIED SUCCESSFULLY!")

if __name__ == "__main__":
    run_suite()
