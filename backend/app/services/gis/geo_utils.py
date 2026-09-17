import math
from typing import List, Tuple


class GeoUtils:
    """Geodetic and spatial analytical calculation utilities."""

    EARTH_RADIUS_KM = 6371.0
    EARTH_RADIUS_METERS = 6371000.0

    @classmethod
    def haversine_distance(
        cls, lat1: float, lon1: float, lat2: float, lon2: float
    ) -> float:
        """Returns great-circle distance between two coordinates in meters."""
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = (
            math.sin(d_lat / 2.0) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(d_lon / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return cls.EARTH_RADIUS_METERS * c

    @classmethod
    def bounding_box_around_point(
        cls, latitude: float, longitude: float, radius_km: float
    ) -> Tuple[float, float, float, float]:
        """
        Computes bounding box (min_lat, min_lon, max_lat, max_lon) for spatial pre-filtering.
        """
        d_lat = radius_km / 111.0
        d_lon = radius_km / (111.0 * math.cos(math.radians(latitude)))
        return (
            latitude - d_lat,
            longitude - d_lon,
            latitude + d_lat,
            longitude + d_lon,
        )

    @classmethod
    def point_in_polygon(cls, point: Tuple[float, float], polygon: List[List[float]]) -> bool:
        """
        Ray-casting algorithm to determine if [lat, lon] lies within polygon boundary ring.
        """
        x, y = point[1], point[0]  # lon, lat
        n = len(polygon)
        inside = False

        p1x, p1y = polygon[0][1], polygon[0][0]
        for i in range(n + 1):
            p2x, p2y = polygon[i % n][1], polygon[i % n][0]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y

        return inside

    @classmethod
    def generate_circle_polygon(
        cls, center_lat: float, center_lon: float, radius_km: float, num_points: int = 32
    ) -> List[List[float]]:
        """Generates coordinate ring for a circular hazard perimeter (e.g. cyclone wind radii)."""
        coordinates = []
        d_lat = radius_km / 111.0
        d_lon = radius_km / (111.0 * math.cos(math.radians(center_lat)))

        for i in range(num_points):
            angle = (2.0 * math.pi * i) / num_points
            lat = center_lat + d_lat * math.sin(angle)
            lon = center_lon + d_lon * math.cos(angle)
            coordinates.append([round(lat, 5), round(lon, 5)])

        # Close the ring
        coordinates.append(coordinates[0])
        return coordinates
