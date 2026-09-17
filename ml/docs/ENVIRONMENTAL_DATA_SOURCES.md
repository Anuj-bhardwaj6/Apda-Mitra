# Apda Mitra (आपदा मित्र) — Production Environmental Data Sources & Feature Pipeline Specification

**Pipeline Version**: `2.0.0`  
**Feature Schema Version**: `10-feat-himalayan-v2`  
**Standard**: Mathematical and semantic identity between Model Training and Production Inference  
$$\text{Training Feature Pipeline} \equiv \text{Production Inference Feature Pipeline}$$

---

## 1. Overview & Architectural Guarantees

The Apda Mitra AI Landslide Hazard Subsystem depends on continuous Earth Observation (EO) and numerical land-surface assimilation to evaluate slope failure susceptibility across the 10 Himalayan and Northeast Indian states (Uttarakhand, Himachal Pradesh, Sikkim, Arunachal Pradesh, Assam, Meghalaya, Nagaland, Manipur, Mizoram, Tripura).

### Non-Fabrication Policy
- The pipeline **strictly rejects synthetic or mock substitution** when upstream telemetry is unavailable and no unexpired cache exists.
- If upstream satellite observations cannot be obtained, the pipeline raises `EnvironmentalDataUnavailableError` (HTTP 503) detailing the specific offline source.

---

## 2. Authoritative Data Sources & Provenance

### Pillar 1: Precipitation Telemetry (NASA POWER / GPM IMERG)
- **Source Agency**: NASA Earth Science Applied Sciences / Global Modeling and Assimilation Office (GMAO)
- **Product Name**: NASA POWER Daily Point API v2.9.7 (GMAO MERRA-2 & NASA GPM IMERG / GPCP calibrated)
- **Parameter**: `PRECTOTCORR` — Bias-corrected total precipitation
- **Unit**: Millimeters per day ($mm/\text{day}$)
- **Spatial Resolution**: $0.5^\circ \times 0.625^\circ$ native grid
- **Temporal Windows & Accumulation Equations**:
  For an evaluation date $T_0$:
  - **`rain_1d`**: Daily precipitation on $T_0$:
    $$\text{rain\_1d} = P(T_0)$$
  - **`rain_3d`**: 3-day short-term cumulative antecedent precipitation:
    $$\text{rain\_3d} = \sum_{t=T_0 - 2}^{T_0} P(t)$$
  - **`rain_7d`**: 7-day cumulative antecedent precipitation:
    $$\text{rain\_7d} = \sum_{t=T_0 - 6}^{T_0} P(t)$$
  - **`rain_15d`**: 15-day cumulative antecedent precipitation:
    $$\text{rain\_15d} = \sum_{t=T_0 - 14}^{T_0} P(t)$$
  - **`rain_30d`**: 30-day cumulative antecedent saturation precipitation:
    $$\text{rain\_30d} = \sum_{t=T_0 - 29}^{T_0} P(t)$$
- **Mathematical Invariant**:
  $$\text{rain\_1d} \le \text{rain\_3d} \le \text{rain\_7d} \le \text{rain\_15d} \le \text{rain\_30d}$$
- **Near-Real-Time (NRT) Assimilation**:
  When evaluating the current day ($T_0 = \text{now}$), the trailing 24h to 168h hourly precipitation is ingested from NASA GPM IMERG Early/Late Run via Open-Meteo High-Resolution assimilation, seamlessly merged with historical NASA POWER daily series.

---

### Pillar 2: Volumetric Topsoil Moisture & Climatological Anomaly
- **Source Agency**: NASA Goddard Space Flight Center (GSFC) / GMAO
- **Product Name**: GMAO MERRA-2 Catchment Land Surface Model (LSM)
- **Parameter**: `GWETTOP` — Topsoil surface wetness ($0 - 5\text{ cm}$)
- **Unit**: Dimensionless volumetric fraction $[0.0, 1.0]$ ($m^3/m^3$)
- **Baseline Period**: WMO 30-Year Climatological Baseline ($1991-01-01$ to $2020-12-31$, 10,958 daily observations per grid cell).
- **Standardized Anomaly Formula**:
  For day of year $d \in [1, 366]$ with baseline mean $\mu_d$ and standard deviation $\sigma_d$:
  $$Z = \frac{\theta(T_0) - \mu_d}{\sigma_d}$$
  - $Z > 0$: Unusually saturated relative to the seasonal climatological norm.
  - $Z < 0$: Drier than the seasonal baseline.

---

### Pillar 3: Geomorphometry & Topography (Copernicus DEM GLO-30)
- **Source Agency**: European Space Agency (ESA) & Airbus Defence and Space
- **Product Name**: Copernicus Digital Elevation Model GLO-30 Cloud-Optimized GeoTIFFs
- **Spatial Resolution**: 1 arc-second (~30 meters at equator)
- **Coordinate Reference System**: EPSG:4326 (WGS84 horizontal, EGM2008 geoid vertical datum)
- **Derived Terrain Metrics**:
  1. **`elevation`**: Orthometric ground elevation in meters above sea level ($m\text{ a.s.l.}$).
  2. **`slope`**: Terrain inclination gradient in degrees ($[0^\circ, 90^\circ]$), computed using the Horn (1981) $3 \times 3$ weighted finite-difference kernel:
     $$\frac{\partial z}{\partial x} = \frac{(z_{++} + 2z_{+0} + z_{+-}) - (z_{-+} + 2z_{-0} + z_{--})}{8 \Delta x}$$
     $$\frac{\partial z}{\partial y} = \frac{(z_{++} + 2z_{0+} + z_{-+}) - (z_{+-} + 2z_{0-} + z_{--})}{8 \Delta y}$$
     $$\text{slope} = \arctan\left(\sqrt{\left(\frac{\partial z}{\partial x}\right)^2 + \left(\frac{\partial z}{\partial y}\right)^2}\right) \times \frac{180}{\pi}$$
  3. **`aspect`**: Direction of maximum downward slope in compass azimuth degrees ($[0^\circ, 360^\circ]$).
  4. **`curvature`**: Profile terrain curvature ($m^{-1}$), Zevenbergen & Thorne (1987). Negative values indicate convex divergent slopes; positive values indicate concave converging flow hollows.

---

## 3. Caching & Freshness Tier Architecture

All extracted data points are persistently cached in a local SQLite database (`ml/data/cache/production_environmental_cache.sqlite`):

| Layer | Time-To-Live (TTL) | Rationale |
| :--- | :--- | :--- |
| **Topography (Copernicus DEM)** | Permanent / 365 days | Geomorphology and terrain elevation are static over decadal timescales. |
| **Soil Moisture Baseline ($\mu_d, \sigma_d$)** | 30 days | Climatological baseline values are fixed for the 1991–2020 epoch. |
| **Historical Rainfall Series** | 24 hours | Past daily rainfall accumulations remain invariant once recorded. |
| **Near-Real-Time Observations** | 1 hour | Reflects incoming GPM IMERG and live meteorological satellite passes. |

Each pipeline response explicitly provides:
- `pipeline_executed_at`: ISO timestamp of pipeline inference execution.
- `rainfall_observed_at`: Exact timestamp of the latest precipitation observation.
- `soil_moisture_observed_at`: Timestamp of soil moisture satellite pass/assimilation.
- `terrain_source`: Identification of DEM grid raster source.
- `cache_status`: `HIT` or `MISS` per observable.
