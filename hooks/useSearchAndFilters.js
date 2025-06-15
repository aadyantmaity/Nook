import { useState } from "react";

export default function useSearchAndFilters(studySpots, favorites) {
  const [filters, setFilters] = useState([]);

  const matchFilters = (spot) => {
    if (!filters.length) return true;
    return filters.every((f) => {
      if (f === "favorites") return favorites.includes(spot.id);
      if (f === "no-husky-card") return !spot.huskyCardNeeded;
      return (spot.tags || []).map((t) => String(t).toLowerCase()).includes(f);
    });
  };

  const filteredSpots = studySpots.filter((spot) => matchFilters(spot));

  return {
    filters,
    setFilters,
    filteredSpots,
  };
}
