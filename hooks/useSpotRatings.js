import { useState, useEffect, useRef } from "react";
import { collection, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function useSpotRatings(spotId, isPrivateNook = false) {
  const [ratings, setRatings] = useState({
    rating: "No rating yet",
    lastUpdated: null,
    lastUpdatedType: null,
    lastWindowHours: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!spotId || isPrivateNook) {
      setRatings({ rating: "N/A", lastUpdated: null, lastUpdatedType: null, lastWindowHours: null });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const getTs = (data) => data.createdAt?.toMillis?.() ?? null;

    unsubscribeRef.current = onSnapshot(
      collection(db, "studySpots", spotId, "ratings"),
      (snapshot) => {
        const now = Date.now();
        const thirtyMinutesAgo = now - 30 * 60 * 1000;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayStartMillis = todayStart.getTime();

        let recentRatings = [];
        let recentLastTimestamp = null;
        snapshot.forEach((doc) => {
          const data = doc.data();
          const ts = getTs(data);
          if (ts !== null && ts >= thirtyMinutesAgo) {
            recentRatings.push(data);
            if (!recentLastTimestamp || ts > recentLastTimestamp)
              recentLastTimestamp = ts;
          }
        });

        let avgRating, lastUpdated, lastUpdatedType, lastWindowHours;

        if (recentRatings.length > 0) {
          avgRating = recentRatings.reduce((s, r) => s + r.rating, 0) / recentRatings.length;
          lastUpdated = recentLastTimestamp;
          lastUpdatedType = "recent";
          lastWindowHours = null;
        } else {
          let found = false;
          let bestWindow = null;
          let bestWindowRatings = [];
          let lastRecentTimestamp = null;
          for (let hours = 1; hours <= 6; hours++) {
            const windowStart = now - hours * 60 * 60 * 1000;
            let windowRatings = [];
            let windowLastTimestamp = null;
            snapshot.forEach((doc) => {
              const data = doc.data();
              const ts = getTs(data);
              if (ts !== null && ts >= windowStart) {
                windowRatings.push(data);
                if (!windowLastTimestamp || ts > windowLastTimestamp)
                  windowLastTimestamp = ts;
              }
            });
            if (windowRatings.length > 0) {
              bestWindow = hours;
              bestWindowRatings = windowRatings;
              lastRecentTimestamp = windowLastTimestamp;
              found = true;
              break;
            }
          }
          let todayRatings = [];
          if (!found) {
            snapshot.forEach((doc) => {
              const data = doc.data();
              const ts = getTs(data);
              if (ts !== null && ts >= todayStartMillis) todayRatings.push(data);
            });
          }

          if (found && bestWindowRatings.length > 0) {
            avgRating = bestWindowRatings.reduce((s, r) => s + r.rating, 0) / bestWindowRatings.length;
            lastUpdated = lastRecentTimestamp;
            lastUpdatedType = "window";
            lastWindowHours = bestWindow;
          } else if (todayRatings.length > 0) {
            avgRating = todayRatings.reduce((s, r) => s + r.rating, 0) / todayRatings.length;
            lastUpdated = Math.max(...todayRatings.map(getTs).filter((v) => v !== null));
            lastUpdatedType = "today";
            lastWindowHours = null;
          } else {
            avgRating = "No rating yet";
            lastUpdated = null;
            lastUpdatedType = null;
            lastWindowHours = null;
          }
        }

        setRatings({ rating: avgRating, lastUpdated, lastUpdatedType, lastWindowHours });
        setIsLoading(false);
      },
      (error) => {
        console.error("Error listening to ratings:", error);
        setIsLoading(false);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [spotId, isPrivateNook]);

  return { ratings, isLoading };
}


