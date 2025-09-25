// Helper for "last updated" display
export function getLastUpdatedLabel(ratings) {
  if (!ratings || !ratings.lastUpdated) return "";
  const now = Date.now();
  let last = null;
  if (typeof ratings.lastUpdated === "number") {
    last = ratings.lastUpdated;
  } else if (
    ratings.lastUpdated &&
    typeof ratings.lastUpdated.toMillis === "function"
  ) {
    last = ratings.lastUpdated.toMillis();
  }
  if (!last) return "";

  const diffMs = now - last;
  const diffMin = Math.floor(diffMs / 60000);

  if (ratings.lastUpdatedType === "window" && ratings.lastWindowHours) {
    if (diffMin < 60) {
      if (diffMin === 0) return "Last updated: just now";
      return `Last updated: ${diffMin} min ago`;
    }
    if (ratings.lastWindowHours === 1) {
      return "Last updated: 1 hour ago";
    }
    return `Last updated: ${ratings.lastWindowHours} hours ago`;
  }
  if (ratings.lastUpdatedType === "today") {
    return "Last updated: Today";
  }
  if (diffMin < 30 && diffMin >= 0) {
    if (diffMin === 0) return "Last updated: just now";
    return `Last updated: ${diffMin} min ago`;
  }
  return "";
}
