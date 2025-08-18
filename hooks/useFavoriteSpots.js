import { useState, useEffect, useCallback } from "react";
import { auth, db } from "../firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
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
      const isOwnProfile = !targetUid || targetUid === user?.uid;

      if (!uid) {
        setFavoriteSpots([]);
        setFavoriteSpotsLoading(false);
        return;
      }

      // Get all study spots and check which ones the user has favorited
      const spotsSnapshot = await getDocs(collection(db, "studySpots"));
      const favIds = [];

      // Check each spot's favoritedBy subcollection for the user
      for (const spotDoc of spotsSnapshot.docs) {
        try {
          const favoritedByDoc = await getDoc(
            doc(db, "studySpots", spotDoc.id, "favoritedBy", uid)
          );

          if (favoritedByDoc.exists()) {
            favIds.push(spotDoc.id);
          }
        } catch (error) {
          console.error(
            "Error checking favoritedBy for spot:",
            spotDoc.id,
            error
          );
        }
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
          // --- Filter out private nooks when viewing other users' profiles ---
          if (
            spotData.privateNook &&
            !isOwnProfile &&
            spotData.addedBy !== user?.uid &&
            !(
              Array.isArray(spotData.sharedWith) &&
              spotData.sharedWith.includes(user?.uid)
            )
          ) {
            continue;
          }
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
              const {
                collection,
                getDocs,
                query,
                where,
                Timestamp,
                onSnapshot,
              } = await import("firebase/firestore");
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

              ratings = {
                noise: averageNoise,
                crowd: averageCrowd,
                lastUpdated,
                lastUpdatedType,
                lastWindowHours,
              };
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
