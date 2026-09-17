"""
APDA MITRA — NASA COOLR Dynamic Service Adapter
===============================================
Queries the official NASA Cooperative Open Online Landslide Repository (COOLR)
ArcGIS FeatureServer service dynamically.

Endpoint:
https://maps.nccs.nasa.gov/mapping/rest/services/COOLR/COOLR_Events_Point/FeatureServer/0/query

Data Provenance:
- Source: NASA COOLR (Cooperative Open Online Landslide Repository)
- Products: Global Landslide Catalog (GLC) & Landslide Reporter Catalog (LRC)
- Fail-safe: Real live events -> Verified NASA inventory records -> Status: UNAVAILABLE. Never fake events.
"""

from __future__ import annotations

import csv
from datetime import datetime, timezone
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx

from app.core.region_config import TARGET_REGION_BBOX, get_state
from app.services.cache_service import cache_service, TTL_COOLR

logger = logging.getLogger("apda_mitra.services.nasa_coolr")

NASA_COOLR_ARCGIS_URL = (
    "https://maps.nccs.nasa.gov/mapping/rest/services/COOLR/COOLR_Events_Point/FeatureServer/0/query"
)
CACHE_KEY_COOLR_LIVE = "nasa_coolr_provenance:events"

# Locate verified CSV inventory (932 verified records across all 10 states)
WORKSPACE_ROOT = Path(__file__).resolve().parents[3]
VERIFIED_CSV_PATH = WORKSPACE_ROOT / "Apda_Mitra_Verified_Landslide_Inventory_v2.csv"


class NasaCoolrService:
    def __init__(self, timeout_seconds: float = 6.0):
        self.timeout = timeout_seconds
        self._verified_records: Optional[List[Dict[str, Any]]] = None

    def _load_verified_inventory(self) -> List[Dict[str, Any]]:
        """Loads verified NASA COOLR records from the verified inventory CSV."""
        if self._verified_records is not None:
            return self._verified_records

        records: List[Dict[str, Any]] = []
        if VERIFIED_CSV_PATH.exists():
            try:
                with open(VERIFIED_CSV_PATH, mode="r", encoding="utf-8", errors="replace") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        try:
                            lat = float(row.get("latitude", 0.0))
                            lon = float(row.get("longitude", 0.0))
                            if lat != 0.0 and lon != 0.0:
                                records.append({
                                    "id": f"coolr-{row.get('event_id', len(records) + 1)}",
                                    "event_title": row.get("event_title") or "Historical Landslide Incident",
                                    "event_date": row.get("event_date") or row.get("event_date_parsed", ""),
                                    "state": row.get("state", "").strip(),
                                    "latitude": lat,
                                    "longitude": lon,
                                    "trigger": row.get("landslide_trigger") or "Heavy Rainfall",
                                    "category": row.get("landslide_category") or "Landslide",
                                    "location_description": row.get("location_description") or "",
                                    "source": "NASA COOLR Catalog",
                                    "source_catalog": row.get("source_catalog") or "Global Landslide Catalog (GLC)",
                                    "source_event_id": str(row.get("event_id") or ""),
                                    "source_link": row.get("source_link") or "",
                                    "status": "HISTORICAL"
                                })
                        except Exception:
                            continue
                logger.info("Loaded %d verified NASA COOLR historical records across target states.", len(records))
            except Exception as e:
                logger.warning("Could not read verified landslide inventory CSV: %s", e)

        self._verified_records = records
        return self._verified_records

    async def fetch_live_events(
        self,
        bbox: Optional[Dict[str, float]] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Dynamically query NASA COOLR FeatureServer with optional bounding box.
        Falls back to verified real inventory. Never creates fake events.
        """
        now_utc = datetime.now(timezone.utc).isoformat()
        bbox_str = (
            f"{bbox['min_lat']:.2f}_{bbox['min_lon']:.2f}_{bbox['max_lat']:.2f}_{bbox['max_lon']:.2f}"
            if bbox else "global"
        )
        cache_key = f"{CACHE_KEY_COOLR_LIVE}:{bbox_str}:{limit}"

        # 1. Check Cache
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return cached_data

        # 2. Query Live NASA COOLR ArcGIS FeatureServer
        params: Dict[str, Any] = {
            "where": "1=1",
            "outFields": "event_id,event_title,ev_date,latitude,longitude,landslide_trigger,landslide_category,location_description,source_name",
            "returnGeometry": "true",
            "f": "json",
            "resultRecordCount": limit,
            "orderByFields": "ev_date DESC"
        }

        if bbox:
            params["geometry"] = f"{bbox['min_lon']},{bbox['min_lat']},{bbox['max_lon']},{bbox['max_lat']}"
            params["geometryType"] = "esriGeometryEnvelope"
            params["spatialRel"] = "esriSpatialRelIntersects"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(NASA_COOLR_ARCGIS_URL, params=params)
                if resp.status_code == 200:
                    raw_data = resp.json()
                    features = raw_data.get("features", [])
                    events: List[Dict[str, Any]] = []

                    for feat in features:
                        attrs = feat.get("attributes", {})
                        geom = feat.get("geometry", {})
                        lat = attrs.get("latitude") or geom.get("y")
                        lon = attrs.get("longitude") or geom.get("x")

                        ev_date_raw = attrs.get("ev_date")
                        ev_date_str = ""
                        if isinstance(ev_date_raw, (int, float)):
                            try:
                                ev_date_str = datetime.fromtimestamp(ev_date_raw / 1000.0, tz=timezone.utc).isoformat()
                            except Exception:
                                ev_date_str = str(ev_date_raw)
                        elif ev_date_raw:
                            ev_date_str = str(ev_date_raw)

                        if lat is not None and lon is not None:
                            events.append({
                                "id": f"coolr-{attrs.get('event_id', len(events) + 1)}",
                                "event_title": attrs.get("event_title") or "Historical Landslide Incident",
                                "event_date": ev_date_str,
                                "latitude": float(lat),
                                "longitude": float(lon),
                                "trigger": attrs.get("landslide_trigger") or "Unknown / Heavy Rainfall",
                                "category": attrs.get("landslide_category") or "Landslide",
                                "location_description": attrs.get("location_description") or "",
                                "source": "NASA COOLR Catalog",
                                "source_catalog": "Global Landslide Catalog (GLC)",
                                "source_event_id": str(attrs.get("event_id") or ""),
                                "status": "HISTORICAL"
                            })

                    if events:
                        payload = {
                            "source": "NASA COOLR Catalog",
                            "fetched_at": now_utc,
                            "status": "HISTORICAL",
                            "count": len(events),
                            "events": events
                        }
                        cache_service.set(cache_key, payload, ttl_seconds=TTL_COOLR, source_tag="nasa_coolr")
                        return payload

        except Exception as err:
            logger.warning("NASA COOLR live query failed (%s). Checking verified inventory.", err)

        # 3. Fail-Safe: Query Verified Real NASA COOLR Dataset
        verified = self._load_verified_inventory()
        filtered_events = verified
        if bbox:
            filtered_events = [
                e for e in verified
                if bbox["min_lat"] <= e["latitude"] <= bbox["max_lat"]
                and bbox["min_lon"] <= e["longitude"] <= bbox["max_lon"]
            ]

        if filtered_events:
            selected_events = filtered_events[:limit]
            payload = {
                "source": "NASA COOLR Catalog",
                "fetched_at": now_utc,
                "status": "HISTORICAL",
                "count": len(selected_events),
                "events": selected_events,
                "dataset_note": "Verified NASA COOLR Landslide Inventory v2"
            }
            cache_service.set(cache_key, payload, ttl_seconds=TTL_COOLR, source_tag="nasa_coolr")
            return payload

        # 4. If completely unavailable, return structured UNAVAILABLE response
        return {
            "source": "NASA COOLR",
            "fetched_at": now_utc,
            "status": "UNAVAILABLE",
            "count": 0,
            "events": [],
            "message": "NASA COOLR landslide event data is currently unavailable."
        }

    async def fetch_region_events(self, limit: int = 100) -> Dict[str, Any]:
        """
        Fetch real events across the 10-state target region.
        Strictly filters out any points outside the 10 Apda Mitra target states.
        Labels all historical events strictly as HISTORICAL.
        """
        target_state_names = {st["name"].lower() for st in TARGET_STATES}
        target_bboxes = [st["bbox"] for st in TARGET_STATES]

        def is_in_target_states(evt: Dict[str, Any]) -> bool:
            st_name = evt.get("state", "").lower()
            if st_name and st_name in target_state_names:
                return True
            lat = evt.get("latitude")
            lon = evt.get("longitude")
            if lat is not None and lon is not None:
                for b in target_bboxes:
                    if b["min_lat"] <= lat <= b["max_lat"] and b["min_lon"] <= lon <= b["max_lon"]:
                        return True
            return False

        verified = self._load_verified_inventory()
        filtered = [e for e in verified if is_in_target_states(e)]
        selected = filtered[:limit]

        now_utc = datetime.now(timezone.utc).isoformat()
        return {
            "source": "NASA COOLR Catalog",
            "fetched_at": now_utc,
            "status": "HISTORICAL",
            "count": len(selected),
            "events": selected,
            "dataset_note": "Verified NASA COOLR Landslide Inventory v2 (10 Target States Only)"
        }

    async def fetch_state_events(self, state_identifier: str, limit: int = 50) -> Dict[str, Any]:
        """Fetch real events for a specific state in the target region."""
        st = get_state(state_identifier)
        if st:
            # Query verified dataset matching state name first for exact administrative alignment
            verified = self._load_verified_inventory()
            state_events = [
                e for e in verified
                if e.get("state", "").lower() == st["name"].lower()
            ]
            if state_events:
                return {
                    "source": "NASA COOLR",
                    "state": st["name"],
                    "fetched_at": datetime.now(timezone.utc).isoformat(),
                    "status": "HISTORICAL",
                    "count": len(state_events[:limit]),
                    "events": state_events[:limit],
                    "dataset_note": "Verified NASA COOLR Landslide Inventory v2"
                }

            # Fallback to state bounding box
            res = await self.fetch_live_events(bbox=st["bbox"], limit=limit)
            res["state"] = st["name"]
            res["status"] = "HISTORICAL"
            return res

        return {
            "source": "NASA COOLR",
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "status": "UNAVAILABLE",
            "count": 0,
            "events": [],
            "message": f"Unknown target state: {state_identifier}"
        }


nasa_coolr_service = NasaCoolrService()
