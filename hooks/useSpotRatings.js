import { useState, useEffect, useRef } from "react";
import { collection, onSnapshot, Timestamp } from "firebase/firestore";
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
      setRatings({ noise: "N/A", crowd: "N/A", lastUpdated: null, lastUpdatedType: null, lastWindowHours: null });
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

        // Only use docs with noise/crowd fields
        const allDocs = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.noise !== undefined && data.crowd !== undefined) {
            allDocs.push(data);
          }
        });

        function computeAvg(docs, field) {
          if (docs.length === 0) return "No rating yet";
          return docs.reduce((s, r) => s + r[field], 0) / docs.length;
        }

        function getDocsInWindow(windowStartMillis) {
          return allDocs.filter((data) => {
            const ts = getTs(data);
            return ts !== null && ts >= windowStartMillis;
          });
        }

        function getLastTs(docs) {
          return Math.max(...docs.map(getTs).filter((v) => v !== null));
        }

        let noiseAvg, crowdAvg, lastUpdated, lastUpdatedType, lastWindowHours;

        const recentDocs = getDocsInWindow(thirtyMinutesAgo);
        if (recentDocs.length > 0) {
          noiseAvg = computeAvg(recentDocs, "noise");
          crowdAvg = computeAvg(recentDocs, "crowd");
          lastUpdated = getLastTs(recentDocs);
          lastUpdatedType = "recent";
          lastWindowHours = null;
        } else {
          let found = false;
          let bestWindow = null;
          let bestDocs = [];
          for (let hours = 1; hours <= 6; hours++) {
            const windowDocs = getDocsInWindow(now - hours * 60 * 60 * 1000);
            if (windowDocs.length > 0) {
              bestWindow = hours;
              bestDocs = windowDocs;
              found = true;
              break;
            }
          }
          const todayDocs = getDocsInWindow(todayStartMillis);

          if (found) {
            noiseAvg = computeAvg(bestDocs, "noise");
            crowdAvg = computeAvg(bestDocs, "crowd");
            lastUpdated = getLastTs(bestDocs);
            lastUpdatedType = "window";
            lastWindowHours = bestWindow;
          } else if (todayDocs.length > 0) {
            noiseAvg = computeAvg(todayDocs, "noise");
            crowdAvg = computeAvg(todayDocs, "crowd");
            lastUpdated = getLastTs(todayDocs);
            lastUpdatedType = "today";
            lastWindowHours = null;
          } else {
            noiseAvg = "No rating yet";
            crowdAvg = "No rating yet";
            lastUpdated = null;
            lastUpdatedType = null;
            lastWindowHours = null;
          }
        }

        setRatings({ noise: noiseAvg, crowd: crowdAvg, lastUpdated, lastUpdatedType, lastWindowHours });
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


