import { useState, useEffect, useCallback } from "react";
import * as Location from "expo-location"; // Add this import
import { auth } from "../firebaseConfig"; // Adjust the import based on your project structure

export default function useSearchAndFilters(studySpots, favorites) {
  const [filters, setFilters] = useState([]);
  const [sortBy, setSortBy] = useState("default");
  // Add user location state:
  const [userLocation, setUserLocation] = useState(null);

  // Helper to get user location (like CheckInButton)
  const fetchUserLocation = useCallback(async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setUserLocation(null);
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch {
      setUserLocation(null);
    }
  }, []);

  // Optionally, fetch location automatically if sortBy is distance
  useEffect(() => {
    if (sortBy === "distance-asc" || sortBy === "distance-desc") {
      fetchUserLocation();
    }
  }, [sortBy, fetchUserLocation]);

  const matchFilters = (spot) => {
    if (!filters.length) return true;
    return filters.every((f) => {
      if (f === "favorites") return favorites.includes(spot.id);
      if (f === "no-husky-card") return !spot.huskyCardNeeded;
      if (f === "private")
        return (
          !!spot.privateNook &&
          (spot.addedBy === auth.currentUser?.uid ||
            (Array.isArray(spot.sharedWith) &&
              spot.sharedWith.includes(auth.currentUser?.uid)))
        );
      // Tag filter: match case-insensitively
      return (spot.tags || [])
        .map((t) => String(t).toLowerCase())
        .includes(f.toLowerCase());
    });
  };

  // Helper: Haversine distance in meters
  function getDistance(lat1, lon1, lat2, lon2) {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Sorting logic (add distance sort)
  let sortedSpots = [...(studySpots || [])];
  if (
    (sortBy === "distance-asc" || sortBy === "distance-desc") &&
    userLocation
  ) {
    sortedSpots = sortedSpots
      .map((spot) => {
        if (
          spot.coordinates &&
          typeof spot.coordinates.latitude === "number" &&
          typeof spot.coordinates.longitude === "number"
        ) {
          return {
            ...spot,
            _distance: getDistance(
              userLocation.latitude,
              userLocation.longitude,
              spot.coordinates.latitude,
              spot.coordinates.longitude
            ),
          };
        }
        return { ...spot, _distance: Infinity };
      })
      .sort((a, b) => a._distance - b._distance);
  }

  const filteredSpots = sortedSpots.filter((spot) => matchFilters(spot));

  // Expose matchFilters and sortBy for use in map/list view
  return {
    filters,
    setFilters,
    filteredSpots,
    matchFilters,
    sortBy,
    setSortBy,
    userLocation,
    fetchUserLocation,
  };
}
