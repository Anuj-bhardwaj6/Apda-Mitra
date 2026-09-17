"""
APDA MITRA — 10-State Target Region Configuration & Geography Registry
======================================================================
Defines the authoritative 10 monitoring states, spatial bounding boxes,
centroids, districts, and regional bounds.
"""

from typing import Any, Dict, List, Optional

TARGET_REGION_NAME = "APDA MITRA TARGET REGION"

# Bounding box covering all 10 states [min_lat, min_lon, max_lat, max_lon]
TARGET_REGION_BBOX = {
    "min_lat": 21.8,
    "max_lat": 33.3,
    "min_lon": 75.5,
    "max_lon": 97.4
}

TARGET_STATES: List[Dict[str, Any]] = [
    {
        "id": "hp",
        "slug": "himachal-pradesh",
        "name": "Himachal Pradesh",
        "name_hi": "हिमाचल प्रदेश",
        "centroid": [31.1048, 77.1734],
        "bbox": {"min_lat": 30.38, "max_lat": 33.22, "min_lon": 75.6, "max_lon": 79.0},
        "default_zoom": 8,
        "districts": [
            {"id": "hp-shimla", "name": "Shimla", "lat": 31.1048, "lon": 77.1734},
            {"id": "hp-mandi", "name": "Mandi", "lat": 31.7087, "lon": 76.9320},
            {"id": "hp-kullu", "name": "Kullu", "lat": 31.9578, "lon": 77.1095},
            {"id": "hp-kangra", "name": "Kangra", "lat": 32.0998, "lon": 76.2691},
            {"id": "hp-kinnaur", "name": "Kinnaur", "lat": 31.6500, "lon": 78.4700},
            {"id": "hp-chamba", "name": "Chamba", "lat": 32.5534, "lon": 76.1258},
            {"id": "hp-lahaul-spiti", "name": "Lahaul and Spiti", "lat": 32.5700, "lon": 77.0300}
        ]
    },
    {
        "id": "uk",
        "slug": "uttarakhand",
        "name": "Uttarakhand",
        "name_hi": "उत्तराखंड",
        "centroid": [30.0668, 79.0193],
        "bbox": {"min_lat": 28.70, "max_lat": 31.46, "min_lon": 77.57, "max_lon": 81.04},
        "default_zoom": 8,
        "districts": [
            {"id": "uk-dehradun", "name": "Dehradun", "lat": 30.3165, "lon": 78.0322},
            {"id": "uk-chamoli", "name": "Chamoli", "lat": 30.4200, "lon": 79.3300},
            {"id": "uk-rudraprayag", "name": "Rudraprayag", "lat": 30.2800, "lon": 78.9800},
            {"id": "uk-uttarkashi", "name": "Uttarkashi", "lat": 30.7300, "lon": 78.4400},
            {"id": "uk-tehri", "name": "Tehri Garhwal", "lat": 30.3800, "lon": 78.4800},
            {"id": "uk-pithoragarh", "name": "Pithoragarh", "lat": 29.5800, "lon": 80.2200},
            {"id": "uk-nainital", "name": "Nainital", "lat": 29.3900, "lon": 79.4500}
        ]
    },
    {
        "id": "sk",
        "slug": "sikkim",
        "name": "Sikkim",
        "name_hi": "सिक्किम",
        "centroid": [27.5330, 88.5122],
        "bbox": {"min_lat": 27.05, "max_lat": 28.13, "min_lon": 88.00, "max_lon": 88.92},
        "default_zoom": 9,
        "districts": [
            {"id": "sk-gangtok", "name": "Gangtok", "lat": 27.3389, "lon": 88.6065},
            {"id": "sk-mangan", "name": "Mangan", "lat": 27.5100, "lon": 88.5300},
            {"id": "sk-namchi", "name": "Namchi", "lat": 27.1700, "lon": 88.3500},
            {"id": "sk-gyalshing", "name": "Gyalshing", "lat": 27.2800, "lon": 88.2400}
        ]
    },
    {
        "id": "ar",
        "slug": "arunachal-pradesh",
        "name": "Arunachal Pradesh",
        "name_hi": "अरुणाचल प्रदेश",
        "centroid": [28.2180, 94.7278],
        "bbox": {"min_lat": 26.65, "max_lat": 29.50, "min_lon": 91.50, "max_lon": 97.40},
        "default_zoom": 7,
        "districts": [
            {"id": "ar-papum-pare", "name": "Papum Pare (Itanagar)", "lat": 27.0844, "lon": 93.6053},
            {"id": "ar-tawang", "name": "Tawang", "lat": 27.5800, "lon": 91.8700},
            {"id": "ar-west-kameng", "name": "West Kameng", "lat": 27.2600, "lon": 92.4200},
            {"id": "ar-east-siang", "name": "East Siang", "lat": 28.0700, "lon": 95.3300},
            {"id": "ar-dibang", "name": "Dibang Valley", "lat": 28.8200, "lon": 95.8800}
        ]
    },
    {
        "id": "as",
        "slug": "assam",
        "name": "Assam",
        "name_hi": "असम",
        "centroid": [26.2006, 92.9376],
        "bbox": {"min_lat": 24.10, "max_lat": 28.00, "min_lon": 89.70, "max_lon": 96.00},
        "default_zoom": 7,
        "districts": [
            {"id": "as-kamrup-m", "name": "Kamrup Metropolitan (Guwahati)", "lat": 26.1445, "lon": 91.7362},
            {"id": "as-dima-hasao", "name": "Dima Hasao (Haflong)", "lat": 25.1800, "lon": 93.0200},
            {"id": "as-karbi-anglong", "name": "Karbi Anglong (Diphu)", "lat": 26.0000, "lon": 93.4300},
            {"id": "as-cachar", "name": "Cachar (Silchar)", "lat": 24.8300, "lon": 92.7800},
            {"id": "as-dibrugarh", "name": "Dibrugarh", "lat": 27.4700, "lon": 94.9100}
        ]
    },
    {
        "id": "ml",
        "slug": "meghalaya",
        "name": "Meghalaya",
        "name_hi": "मेघालय",
        "centroid": [25.4670, 91.3662],
        "bbox": {"min_lat": 25.00, "max_lat": 26.10, "min_lon": 89.80, "max_lon": 92.80},
        "default_zoom": 9,
        "districts": [
            {"id": "ml-east-khasi", "name": "East Khasi Hills (Shillong)", "lat": 25.5788, "lon": 91.8933},
            {"id": "ml-ri-bhoi", "name": "Ri-Bhoi (Nongpoh)", "lat": 25.9000, "lon": 91.8800},
            {"id": "ml-west-khasi", "name": "West Khasi Hills", "lat": 25.5200, "lon": 91.2600},
            {"id": "ml-west-garo", "name": "West Garo Hills (Tura)", "lat": 25.5200, "lon": 90.2200},
            {"id": "ml-east-jaintia", "name": "East Jaintia Hills", "lat": 25.3200, "lon": 92.4200}
        ]
    },
    {
        "id": "nl",
        "slug": "nagaland",
        "name": "Nagaland",
        "name_hi": "नागालैंड",
        "centroid": [26.1584, 94.5624],
        "bbox": {"min_lat": 25.20, "max_lat": 27.05, "min_lon": 93.30, "max_lon": 95.25},
        "default_zoom": 8,
        "districts": [
            {"id": "nl-kohima", "name": "Kohima", "lat": 25.6751, "lon": 94.1086},
            {"id": "nl-dimapur", "name": "Dimapur", "lat": 25.9100, "lon": 93.7300},
            {"id": "nl-mokokchung", "name": "Mokokchung", "lat": 26.3300, "lon": 94.5300},
            {"id": "nl-phek", "name": "Phek", "lat": 25.6800, "lon": 94.5000}
        ]
    },
    {
        "id": "mn",
        "slug": "manipur",
        "name": "Manipur",
        "name_hi": "मणिपुर",
        "centroid": [24.6637, 93.9063],
        "bbox": {"min_lat": 23.80, "max_lat": 25.70, "min_lon": 93.00, "max_lon": 94.80},
        "default_zoom": 8,
        "districts": [
            {"id": "mn-imphal-w", "name": "Imphal West", "lat": 24.8170, "lon": 93.9368},
            {"id": "mn-churachandpur", "name": "Churachandpur", "lat": 24.3300, "lon": 93.6800},
            {"id": "mn-noney", "name": "Noney (Tupul)", "lat": 24.7800, "lon": 93.6000},
            {"id": "mn-senapati", "name": "Senapati", "lat": 25.2600, "lon": 94.0100},
            {"id": "mn-tamenglong", "name": "Tamenglong", "lat": 24.9800, "lon": 93.4900}
        ]
    },
    {
        "id": "mz",
        "slug": "mizoram",
        "name": "Mizoram",
        "name_hi": "मिजोरम",
        "centroid": [23.1645, 92.9376],
        "bbox": {"min_lat": 21.90, "max_lat": 24.55, "min_lon": 92.20, "max_lon": 93.45},
        "default_zoom": 8,
        "districts": [
            {"id": "mz-aizawl", "name": "Aizawl", "lat": 23.7271, "lon": 92.7176},
            {"id": "mz-lunglei", "name": "Lunglei", "lat": 22.8800, "lon": 92.7300},
            {"id": "mz-champhai", "name": "Champhai", "lat": 23.4700, "lon": 93.3300},
            {"id": "mz-kolasib", "name": "Kolasib", "lat": 24.2200, "lon": 92.6800}
        ]
    },
    {
        "id": "tr",
        "slug": "tripura",
        "name": "Tripura",
        "name_hi": "त्रिपुरा",
        "centroid": [23.9408, 91.9882],
        "bbox": {"min_lat": 22.90, "max_lat": 24.55, "min_lon": 91.10, "max_lon": 92.35},
        "default_zoom": 9,
        "districts": [
            {"id": "tr-west", "name": "West Tripura (Agartala)", "lat": 23.8315, "lon": 91.2868},
            {"id": "tr-dhalai", "name": "Dhalai (Ambassa)", "lat": 23.8400, "lon": 91.8600},
            {"id": "tr-north", "name": "North Tripura (Dharmanagar)", "lat": 24.1800, "lon": 92.1700},
            {"id": "tr-south", "name": "South Tripura (Belonia)", "lat": 23.2300, "lon": 91.4600}
        ]
    }
]


def get_state(state_query: str) -> Optional[Dict[str, Any]]:
    """Look up a state by slug, id, or case-insensitive name."""
    query = state_query.strip().lower().replace(" ", "-").replace("_", "-")
    for s in TARGET_STATES:
        if (
            s["id"].lower() == query
            or s["slug"].lower() == query
            or s["name"].lower().replace(" ", "-") == query
        ):
            return s
    return None


def get_state_sampling_grid(state_query: str, max_points: int = 5) -> List[List[float]]:
    """
    Generate multi-point spatial sampling grid within state boundary
    combining centroid and key distributed district points.
    """
    st = get_state(state_query)
    if not st:
        return []
    grid = [st["centroid"]]
    districts = st.get("districts", [])
    for d in districts:
        coords = [d["lat"], d["lon"]]
        if coords not in grid:
            grid.append(coords)
        if len(grid) >= max_points:
            break
    return grid
