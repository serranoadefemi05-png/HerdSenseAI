import math


def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Returns distance between two GPS points in meters.
    """

    R = 6371000

    lat1 = math.radians(lat1)
    lon1 = math.radians(lon1)
    lat2 = math.radians(lat2)
    lon2 = math.radians(lon2)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )

    return R * c


def outside_geofence(
    current_lat,
    current_lon,
    farm_lat,
    farm_lon,
    radius=500
):
    """
    Returns True if animal leaves the farm.
    Radius is in meters.
    """

    distance = calculate_distance(
        current_lat,
        current_lon,
        farm_lat,
        farm_lon
    )

    return distance > radius