import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

export default function useStudySpots() {
  const [studySpots, setStudySpots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStudySpots = async () => {
    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const allQuery = collection(db, "studySpots");
      const allSnap = await getDocs(allQuery);
      const allDocs = allSnap.docs;

      const spots = await Promise.all(
        allDocs.map(async (docSnap) => {
          const spotData = docSnap.data();

          // Fetch locationAlerts for the spot
          const locationAlertsRef = doc(db, "studySpots", docSnap.id);
          const locationAlertsDoc = await getDoc(locationAlertsRef);
          let locationAlerts = locationAlertsDoc.exists()
            ? locationAlertsDoc.data().locationAlerts || []
            : [];
          // Normalize alerts: ensure each is { text, createdAt }
          locationAlerts = Array.isArray(locationAlerts)
            ? locationAlerts.map((a) =>
                typeof a === "string"
                  ? { text: a, createdAt: null }
                  : { text: a.text, createdAt: a.createdAt ?? null }
              )
            : [];

          // Fetch ratings for the spot
          const ratingsQuery = query(
            collection(db, "ratings"),
            where("spotId", "==", docSnap.id)
          );
          const ratingsSnapshot = await getDocs(ratingsQuery);

          const now = Timestamp.now().toMillis();
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
            let bestWindowStart = null;
            let bestWindowEnd = null;
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
                bestWindowStart = windowStart;
                bestWindowEnd = now;
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

          // Fetch overall ratings for the spot
          const overallRatingsQuery = query(
            collection(db, "overallRatings"),
            where("spotId", "==", docSnap.id)
          );
          const overallRatingsSnapshot = await getDocs(overallRatingsQuery);
          let overallSum = 0;
          let overallCount = 0;
          overallRatingsSnapshot.forEach((r) => {
            overallSum += r.data().rating || 0;
            overallCount++;
          });
          const averageOverallRating =
            overallCount > 0 ? overallSum / overallCount : 0;

          // No image caching, just use photoUrl
          return {
            id: docSnap.id,
            ...spotData,
            locationAlerts,
            photoUrl: spotData.photoUrl || "",
            cachedPhotoUri: spotData.photoUrl || "",
            ratings: {
              noise: averageNoise,
              crowd: averageCrowd,
              lastUpdated,
              lastUpdatedType,
              lastWindowHours,
            },
            averageOverallRating,
            overallRatingsCount: overallCount,
          };
        })
      );
      setStudySpots(spots);
    } catch (error) {
      console.error("Error fetching study spots:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudySpots();
  }, []);

  return { studySpots, isLoading, fetchStudySpots };
}
