# AI Landslide Engine — Dataset & Lineage Documentation

## 1. Geographic Coverage: North Eastern Region (NER)

All datasets are spatially bounded to the North Eastern Region of India:
- **Latitude Bounds:** `20.0° N` to `30.0° N`
- **Longitude Bounds:** `88.0° E` to `98.0° E`
- **Covered States:** Assam, Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, Tripura.

---

## 2. Source Ingestion Catalogs

| Source Name | Provider | Resolution / Frequency | Storage Format | Acquisition Script |
|---|---|---|---|---|
| **Global Landslide Catalog (GLC)** | NASA / COOLR | Event-based (1988–present) | `datasets/raw/nasa_glc_ner.csv` | `download_nasa.py` |
| **Historical Weather Archive** | Open-Meteo | Hourly / 0.1° (~11km) | `datasets/raw/openmeteo_weather_ner.parquet` | `download_openmeteo.py` |
| **Digital Elevation Model (DEM)** | NASA SRTM 1-ArcSec | 30m grid | `datasets/raw/srtm_dem_ner/` (GeoTIFF) | `download_srtm.py` |
| **Soil Moisture Active Passive** | NASA SMAP / Open-Meteo | 0–1cm, 1–3cm volumetric | `datasets/raw/smap_soil_moisture_ner.parquet` | `download_smap.py` |
| **WorldCover 2021** | European Space Agency (ESA) | 10m land cover grid | `datasets/raw/worldcover_ner/` (GeoTIFF) | `download_worldcover.py` |
| **Road & River Networks** | OpenStreetMap (OSM) | Vector geometries | `datasets/raw/osm_*.gpkg` (EPSG:32645) | `download_osm.py` |
| **Citizen Incident Telemetry** | Apda Mitra PostgreSQL | Real-time crowd reports | PostGIS `incident_reports` table | `retrain_pipeline.py` |

---

## 3. Data Cleansing & Negative Sampling

- **Deduplication:** Spatial and temporal deduplication of events occurring within 100 meters and 24 hours of one another.
- **Negative Sample Generation:** For supervised binary classification (`landslide = 0`), negative control points are synthesized across the NER bounding box using stratified spatial sampling:
  - Minimum distance of 0.10° (~11 km) from any known historical failure site.
  - Stratified across terrain elevations and slope classes to avoid bias toward flat plains.
  - Imbalanced ratio maintained at `3:1` (negative to positive) and compensated in training using XGBoost `scale_pos_weight`.

---

## 4. Feature Scaling & Encoding

- **StandardScaler:** Saved as `scaler.joblib`, normalizes continuous distributions (elevation, slope, rainfall, wetness index).
- **Cyclical Encoding:** Temporal month attributes are transformed via:
  $$\text{month\_sin} = \sin\left(\frac{2\pi \cdot (\text{month}-1)}{12}\right), \quad \text{month\_cos} = \cos\left(\frac{2\pi \cdot (\text{month}-1)}{12}\right)$$
- **Seasonal Categorization:** Mapped according to Indian Meteorological Department (IMD) standards:
  - `1.0`: Winter (Dec–Feb)
  - `2.0`: Pre-Monsoon / Summer (Mar–May)
  - `3.0`: South-West Monsoon (Jun–Sep) — *Peak Hazard Window*
  - `4.0`: Post-Monsoon (Oct–Nov)
