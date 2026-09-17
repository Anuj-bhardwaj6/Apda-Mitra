from datetime import datetime, timedelta, timezone
from app.schemas.ai import PredictionResponse, TrajectoryPredictionItem


class PredictionEngine:
    """
    Simulates spatiotemporal hazard evolution including cyclone track cones,
    river flood stage breach projections, and storm surge inundation footprints.
    """

    @classmethod
    async def predict_hazard_trajectory(
        cls, hazard_type: str, origin_lat: float, origin_lon: float, forecast_hours: int = 24
    ) -> PredictionResponse:
        now = datetime.now(timezone.utc)
        items = []

        # Vector progression heading North-West towards coast
        lat_step = 0.18
        lon_step = -0.12

        for step, hour in enumerate([3, 6, 12, 18, 24]):
            if hour > forecast_hours:
                break
            proj_lat = round(origin_lat + lat_step * (step + 1), 4)
            proj_lon = round(origin_lon + lon_step * (step + 1), 4)
            intensity = max(75.0, round(120.0 - step * 6.5, 1))
            surge = max(0.5, round(1.8 - step * 0.25, 2))

            items.append(
                TrajectoryPredictionItem(
                    hours_ahead=hour,
                    projected_latitude=proj_lat,
                    projected_longitude=proj_lon,
                    estimated_intensity_kmh=intensity,
                    surge_height_meters=surge,
                )
            )

        landfall_time = (now + timedelta(hours=8)).strftime("%Y-%m-%d %H:%M UTC")

        return PredictionResponse(
            hazard_id="HAZ-PRED-SIM-01",
            hazard_type=hazard_type.upper(),
            forecast_window_hours=forecast_hours,
            projected_inundation_sqkm=45.8,
            estimated_landfall_time=landfall_time,
            trajectory=items,
        )
