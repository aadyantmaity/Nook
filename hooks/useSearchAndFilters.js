import { useState } from "react";

// Simple fuzzy search function
function fuzzyMatch(str, query) {
  if (!str || !query) return false;
  str = str.toLowerCase();
  query = query.toLowerCase();
  let qi = 0;
  for (let si = 0; si < str.length && qi < query.length; si++) {
    if (str[si] === query[qi]) qi++;
  }
  return qi === query.length;
}

export default function useSearchAndFilters(studySpots, favorites) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState([]);

  const searchFilter = (spot) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const fields = [
      spot.name,
      spot.buildingName,
      spot.roomNumber,
      ...(spot.tags || []),
      ...(spot.features || []),
    ];
    return fields.some((field) =>
      typeof field === "string" ? fuzzyMatch(field, q) : false
    );
  };

  const matchFilters = (spot) => {
    if (!filters.length) return true;
    return filters.every((f) => {
      if (f === "favorites") return favorites.includes(spot.id);
      if (f === "no-husky-card") return !spot.huskyCardNeeded;
      return (spot.tags || []).map((t) => String(t).toLowerCase()).includes(f);
    });
  };

  const filteredSpots = studySpots.filter(
    (spot) => matchFilters(spot) && searchFilter(spot)
  );

  return {
    search,
    setSearch,
    filters,
    setFilters,
    filteredSpots,
  };
}
