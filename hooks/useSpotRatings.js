import { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function useSpotRatings(spotId, isPrivateNook = false) {
  const [ratings, setRatings] = useState({
    noise: "No rating yet",
    crowd: "No rating yet",
    lastUpdated: null,
    lastUpdatedType: null,
    lastWindowHours: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!spotId || isPrivateNook) {
      setRatings({
        noise: "N/A",
        crowd: "N/A",
        lastUpdated: null,
        lastUpdatedType: null,
        lastWindowHours: null,
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const ratingsQuery = query(
      collection(db, "ratings"),
      where("spotId", "==", spotId)
    );

    unsubscribeRef.current = onSnapshot(
      ratingsQuery,
      (ratingsSnapshot) => {
        const now = Date.now();
        const thirtyMinutesAgo = now - 30 * 60 * 1000;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayStartMillis = todayStart.getTime();

        let recentRatings = [];
        let recentLastTimestamp = null;
        ratingsSnapshot.forEach((ratingDoc) => {
          const ratingData = ratingDoc.data();
          if (!ratingData.timestamp) return;
          const ts = ratingData.timestamp.toMillis();
          if (ts >= thirtyMinutesAgo) {
            recentRatings.push(ratingData);
            if (!recentLastTimestamp || ts > recentLastTimestamp)
              recentLastTimestamp = ts;
          }
        });

        let averageNoise,
          averageCrowd,
          lastUpdated,
          lastUpdatedType,
          lastWindowHours;

        if (recentRatings.length > 0) {
          let noiseSum = 0,
            crowdSum = 0;
          recentRatings.forEach((r) => {
            noiseSum += r.noise;
            crowdSum += r.crowd;
          });
          averageNoise = noiseSum / recentRatings.length;
          averageCrowd = crowdSum / recentRatings.length;
          lastUpdated = recentLastTimestamp;
          lastUpdatedType = "recent";
          lastWindowHours = null;
        } else {
          let bestWindow = null;
          let bestWindowRatings = [];
          let lastRecentTimestamp = null;
          let found = false;
          for (let hours = 1; hours <= 6; hours++) {
            const windowStart = now - hours * 60 * 60 * 1000;
            let windowRatings = [];
            let windowLastTimestamp = null;
            ratingsSnapshot.forEach((ratingDoc) => {
              const ratingData = ratingDoc.data();
              const ts = ratingData.timestamp
                ? ratingData.timestamp.toMillis()
                : null;
              if (ts !== null && ts >= windowStart) {
                windowRatings.push(ratingData);
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
            ratingsSnapshot.forEach((ratingDoc) => {
              const ratingData = ratingDoc.data();
              const ts = ratingData.timestamp
                ? ratingData.timestamp.toMillis()
                : null;
              if (ts !== null && ts >= todayStartMillis) {
                todayRatings.push(ratingData);
              }
            });
          }

          if (found && bestWindowRatings.length > 0) {
            let noiseSum = 0,
              crowdSum = 0;
            bestWindowRatings.forEach((r) => {
              noiseSum += r.noise;
              crowdSum += r.crowd;
            });
            averageNoise = noiseSum / bestWindowRatings.length;
            averageCrowd = crowdSum / bestWindowRatings.length;
            lastUpdated = lastRecentTimestamp;
            lastUpdatedType = "window";
            lastWindowHours = bestWindow;
          } else if (todayRatings.length > 0) {
            let noiseSumDay = 0,
              crowdSumDay = 0;
            todayRatings.forEach((r) => {
              noiseSumDay += r.noise;
              crowdSumDay += r.crowd;
            });
            averageNoise = noiseSumDay / todayRatings.length;
            averageCrowd = crowdSumDay / todayRatings.length;
            lastUpdated = Math.max(
              ...todayRatings
                .map((r) => (r.timestamp ? r.timestamp.toMillis() : null))
                .filter((v) => v !== null)
            );
            lastUpdatedType = "today";
            lastWindowHours = null;
          } else {
            averageNoise = "No rating yet";
            averageCrowd = "No rating yet";
            lastUpdated = null;
            lastUpdatedType = null;
            lastWindowHours = null;
          }
        }

        setRatings({
          noise: averageNoise,
          crowd: averageCrowd,
          lastUpdated,
          lastUpdatedType,
          lastWindowHours,
        });
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
