import { useState, useEffect, useCallback } from "react";
import { auth, db } from "../firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

export default function useFavoriteSpots(targetUid = null) {
  const [favorites, setFavorites] = useState([]);
  const [favoriteSpots, setFavoriteSpots] = useState([]);
  const [favoriteSpotsLoading, setFavoriteSpotsLoading] = useState(true);

  // Fetch favorite spots for the user
  const fetchFavoriteSpots = useCallback(async () => {
    setFavoriteSpotsLoading(true);
    try {
      const user = auth.currentUser;
      const uid = targetUid || user?.uid;
      if (!uid) {
        setFavoriteSpots([]);
        setFavoriteSpotsLoading(false);
        return;
      }
      const userDoc = await getDoc(doc(db, "users", uid));
      let favIds = [];
      if (userDoc.exists()) {
        favIds = userDoc.data().favorites || [];
      }
      setFavorites(favIds);
      if (favIds.length === 0) {
        setFavoriteSpots([]);
        setFavoriteSpotsLoading(false);
        return;
      }
      // Fetch all favorite spots in parallel
      const spotDocs = await Promise.all(
        favIds.map((id) => getDoc(doc(db, "studySpots", id)))
      );
      const spots = [];
      for (let i = 0; i < spotDocs.length; i++) {
        const docSnap = spotDocs[i];
        if (docSnap.exists()) {
          const spotData = docSnap.data();
          // --- Filter out private nooks not owned by user ---
          if (spotData.privateNook && spotData.addedBy !== uid) continue;
          // Hide ratings for private nooks
          let ratings = spotData.privateNook
            ? {
                noise: "N/A",
                crowd: "N/A",
                lastUpdated: null,
                lastUpdatedType: null,
                lastWindowHours: null,
              }
            : {
                noise: "N/A",
                crowd: "N/A",
                lastUpdated: null,
                lastUpdatedType: null,
                lastWindowHours: null,
              };
          if (!spotData.privateNook) {
            // --- Add: Fetch ratings for each favorite spot ---
            try {
              const { collection, getDocs, query, where, Timestamp } =
                await import("firebase/firestore");
              const ratingsQuery = query(
                collection(db, "ratings"),
                where("spotId", "==", docSnap.id)
              );
              const ratingsSnapshot = await getDocs(ratingsQuery);

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
                  averageNoise = "N/A";
                  averageCrowd = "N/A";
                  lastUpdated = null;
                  lastUpdatedType = null;
                  lastWindowHours = null;
                }
              }

              // --- Fetch overall ratings for this spot ---
              let averageOverallRating = 0;
              let overallRatingsCount = 0;
              try {
                const overallRatingsQuery = query(
                  collection(db, "overallRatings"),
                  where("spotId", "==", docSnap.id)
                );
                const overallRatingsSnapshot = await getDocs(
                  overallRatingsQuery
                );
                let sum = 0,
                  count = 0;
                overallRatingsSnapshot.forEach((doc) => {
                  const data = doc.data();
                  sum += data.rating || 0;
                  count++;
                });
                averageOverallRating = count > 0 ? sum / count : 0;
                overallRatingsCount = count;
              } catch (e) {
                averageOverallRating = 0;
                overallRatingsCount = 0;
              }

              ratings = {
                noise: averageNoise,
                crowd: averageCrowd,
                lastUpdated,
                lastUpdatedType,
                lastWindowHours,
              };
              // Attach overall rating fields to spotData below
              spotData.averageOverallRating = averageOverallRating;
              spotData.overallRatingsCount = overallRatingsCount;
            } catch (e) {
              // fallback to N/A
            }
          }
          // --- End ratings fetch ---
          spots.push({
            id: docSnap.id,
            ...spotData,
            ratings,
            cachedPhotoUri: spotData.photoUrl || "",
            averageOverallRating: spotData.averageOverallRating || 0,
            overallRatingsCount: spotData.overallRatingsCount || 0,
          });
        }
      }
      setFavoriteSpots(spots);
    } catch (e) {
      setFavoriteSpots([]);
    } finally {
      setFavoriteSpotsLoading(false);
    }
  }, [targetUid]);

  useEffect(() => {
    fetchFavoriteSpots();
  }, [fetchFavoriteSpots]);

  return {
    favorites,
    favoriteSpots,
    favoriteSpotsLoading,
    cachedFavoriteSpotImages: {}, // always empty, not used
    fetchFavoriteSpots,
  };
}
