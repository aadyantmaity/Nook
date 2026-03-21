import { useState, useEffect, useCallback } from "react";
import * as Location from "expo-location"; // Add this import
import { auth, db } from "../firebaseConfig"; // Adjust the import based on your project structure
import { doc, getDoc } from "firebase/firestore";

// Custom hook to check favorite status for filtering
export function useFavoriteStatusForFilter() {
  const [favoriteStatusCache, setFavoriteStatusCache] = useState(new Map());

  const checkFavoriteStatus = useCallback(
    async (spotId) => {
      const user = auth.currentUser;
      if (!user || !spotId) return false;

      // Check cache first
      if (favoriteStatusCache.has(spotId)) {
        return favoriteStatusCache.get(spotId);
      }

      try {
        const favoritedByDoc = await getDoc(
          doc(db, "studySpots", spotId, "favoritedBy", user.uid)
        );
        const isFavorite = favoritedByDoc.exists();

        // Update cache
        setFavoriteStatusCache((prev) => new Map(prev).set(spotId, isFavorite));

        return isFavorite;
      } catch (error) {
        console.error("Error checking favorite status for filter:", error);
        return false;
      }
    },
    [favoriteStatusCache]
  );

  // Clear cache when user changes
  useEffect(() => {
    setFavoriteStatusCache(new Map());
  }, [auth.currentUser?.uid]);

  return checkFavoriteStatus;
}

export default function useSearchAndFilters(
  studySpots,
  checkFavoriteStatus = null,
  favoritesSet = null // <-- add this param
) {
  const [filters, setFilters] = useState([]);
  const [sortBy, setSortBy] = useState("name-asc"); // Default to A-Z
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

  const matchFilters = async (spot) => {
    if (!filters.length) return true;

    for (const f of filters) {
      if (f === "no-husky-card") {
        if (spot.huskyCardNeeded) return false;
      } else if (f === "private") {
        const isPrivate =
          !!spot.privateNook &&
          (spot.addedBy === auth.currentUser?.uid ||
            (Array.isArray(spot.sharedWith) &&
              spot.sharedWith.includes(auth.currentUser?.uid)));
        if (!isPrivate) return false;
      } else {
        // Tag filter: match case-insensitively
        const hasTag = (spot.tags || [])
          .map((t) => String(t).toLowerCase())
          .includes(f.toLowerCase());
        if (!hasTag) return false;
      }
    }
    return true;
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

  // Sorting logic (add distance sort and others)
  let sortedSpots = [...(studySpots || [])];

  // Distance sort (handled first, as before)
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
      .sort((a, b) =>
        sortBy === "distance-asc"
          ? a._distance - b._distance
          : b._distance - a._distance
      );
  } else if (sortBy === "name-asc" || sortBy === "default") {
    sortedSpots.sort((a, b) =>
      (a.buildingName || a.name || "").localeCompare(
        b.buildingName || b.name || ""
      )
    );
  } else if (sortBy === "noise-asc") {
    sortedSpots.sort((a, b) => {
      const aNoise = typeof a.ratings?.noise === "number" ? a.ratings.noise : 999;
      const bNoise = typeof b.ratings?.noise === "number" ? b.ratings.noise : 999;
      return aNoise - bNoise;
    });
  } else if (sortBy === "crowd-asc") {
    sortedSpots.sort((a, b) => {
      const aCrowd = typeof a.ratings?.crowd === "number" ? a.ratings.crowd : 999;
      const bCrowd = typeof b.ratings?.crowd === "number" ? b.ratings.crowd : 999;
      return aCrowd - bCrowd;
    });
  }
  // else: default order (as fetched)

  // For now, filter out favorites filter and apply other filters synchronously
  const syncFilters = filters; // .filter((f) => f !== "favorites");
  // const hasFavoritesFilter = filters.includes("favorites");

  const syncFilteredSpots = sortedSpots.filter((spot) => {
    if (!syncFilters.length) return true;
    return syncFilters.every((f) => {
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
  });

  // Always return syncFilteredSpots, no favorites filter logic
  let spots = [...syncFilteredSpots];
  // Only apply favorites sorting for default/alphabetical sort
  if (favoritesSet && favoritesSet.size > 0 && (sortBy === "name-asc" || sortBy === "default")) {
    spots.sort((a, b) => {
      const aFav = favoritesSet.has(a.id);
      const bFav = favoritesSet.has(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      // Both in same group, sort alphabetically
      return (a.buildingName || a.name || "").localeCompare(
        b.buildingName || b.name || ""
      );
    });
  }
  return {
    filters,
    setFilters,
    filteredSpots: spots,
    matchFilters,
    sortBy,
    setSortBy,
    userLocation,
    fetchUserLocation,
  };
}
