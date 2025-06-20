import { useState } from "react";
import { auth } from "../firebaseConfig"; // Adjust the import based on your project structure

export default function useSearchAndFilters(studySpots, favorites) {
  const [filters, setFilters] = useState([]);
  const [sortBy, setSortBy] = useState("default");

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

  // --- Sorting logic ---
  function sortSpots(spots) {
    switch (sortBy) {
      case "name-asc":
        return [...spots].sort((a, b) =>
          (a.name || "").localeCompare(b.name || "")
        );
      case "name-desc":
        return [...spots].sort((a, b) =>
          (b.name || "").localeCompare(a.name || "")
        );
      case "noise-asc":
        return [...spots].sort(
          (a, b) =>
            (typeof a.ratings?.noise === "number" ? a.ratings.noise : 99) -
            (typeof b.ratings?.noise === "number" ? b.ratings.noise : 99)
        );
      case "crowd-asc":
        return [...spots].sort(
          (a, b) =>
            (typeof a.ratings?.crowd === "number" ? a.ratings.crowd : 99) -
            (typeof b.ratings?.crowd === "number" ? b.ratings.crowd : 99)
        );
      case "overall-desc":
        return [...spots].sort(
          (a, b) =>
            (b.averageOverallRating || 0) - (a.averageOverallRating || 0)
        );
      default:
        return spots;
    }
  }

  const filteredSpots = sortSpots(
    studySpots.filter((spot) => matchFilters(spot))
  );

  // Expose matchFilters and sortBy for use in map/list view
  return {
    filters,
    setFilters,
    filteredSpots,
    matchFilters,
    sortBy,
    setSortBy,
  };
}
