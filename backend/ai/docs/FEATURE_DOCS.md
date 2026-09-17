# AI Landslide Engine — Feature Engineering Reference

The model consumes **22 canonical ordered features**. Feature order is invariant and verified during both offline training and live production inference.

| Index | Feature Name | Unit / Type | Primary Source | Physical Relevance to Slope Failure |
|---|---|---|---|---|
| **0** | `latitude` | Decimal degrees | Request / GPS | Geographic latitude within North East India. |
| **1** | `longitude` | Decimal degrees | Request / GPS | Geographic longitude within North East India. |
| **2** | `elevation` | Meters | NASA SRTM 30m | High altitudes correlate with orographic rainfall and steeper bedrock relief. |
| **3** | `slope` | Degrees [0–90] | NASA SRTM 30m | Primary driver of gravitational shear stress. Critical instability typically occurs between 25°–45°. |
| **4** | `aspect` | Degrees [0–360] | NASA SRTM 30m | Direction of slope face relative to prevailing monsoon windward precipitation tracks. |
| **5** | `curvature` | $1/m$ (profile) | NASA SRTM 30m | Concave hollows concentrate subsurface pore water; convex ridges disperse runoff. |
| **6** | `topographic_wetness_index` | Dimensionless | SRTM (Derived) | $\ln(A_s / \tan\beta)$; quantifies regional hydrological accumulation zones. |
| **7** | `rainfall_24h` | Millimeters (mm) | Open-Meteo | Acute trigger; intense 24h precipitation saturates soil mantle and spikes pore pressure. |
| **8** | `rainfall_72h` | Millimeters (mm) | Open-Meteo | Sub-acute antecedent saturation metric. |
| **9** | `rainfall_7d` | Millimeters (mm) | Open-Meteo | Cumulative weekly antecedent rainfall establishing base hydrological water table. |
| **10** | `humidity` | Percentage (%) | Open-Meteo | Atmospheric vapor pressure; controls ground evapotranspiration rate. |
| **11** | `temperature` | Celsius (°C) | Open-Meteo | Thermal expansion/contraction and freeze-thaw weathering in high-altitude Sikkim/Arunachal. |
| **12** | `wind_speed` | km/h | Open-Meteo | Dynamic force driving wind-throw on trees situated on steep slopes. |
| **13** | `pressure` | hPa | Open-Meteo | Barometric pressure; signals active low-pressure monsoon depressions and cyclone remnants. |
| **14** | `soil_moisture_surface` | $m^3/m^3$ | NASA SMAP / Open-Meteo | Volumetric water content in top 0–1cm soil horizon. |
| **15** | `soil_moisture_10cm` | $m^3/m^3$ | NASA SMAP / Open-Meteo | Volumetric water content in 1–3cm root horizon. |
| **16** | `land_cover_class` | Discrete Code | ESA WorldCover 10m | 10=Trees (high root cohesion), 50=Built-up, 60=Bare soil (high erosion). |
| **17** | `ndvi_proxy` | [-0.2 to 1.0] | WorldCover (Derived) | Proxy for vegetative root reinforcement index. |
| **18** | `distance_to_river_m` | Meters | OSM Rivers GPKG | Proximity to river channels undergoing fluvial toe-erosion and undercut slumping. |
| **19** | `distance_to_road_m` | Meters | OSM Roads GPKG | Anthropogenic destabilization from road cut excavation and improper highway drainage. |
| **20** | `historical_landslide_density` | Normalized [0–1] | NASA GLC (KDE) | Spatial recurrence clustering of past slope failure events within a 25km radius. |
| **21** | `citizen_report_density` | Normalized [0–1] | PostGIS incident_reports | Live crowd-sourced verification signal from citizens on the ground. |
| **22** | `month_sin` | [-1.0, 1.0] | Temporal Transform | Cyclical sine encoding of current calendar month. |
| **23** | `month_cos` | [-1.0, 1.0] | Temporal Transform | Cyclical cosine encoding of current calendar month. |
| **24** | `season` | [1.0–4.0] | Temporal Transform | Monsoon classification: 1=Winter, 2=Pre-Monsoon, 3=Monsoon, 4=Post-Monsoon. |
