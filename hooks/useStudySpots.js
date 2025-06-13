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
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { auth, db } from "../firebaseConfig";

export default function useStudySpots() {
  const [studySpots, setStudySpots] = useState([]);
  const [imageCache, setImageCache] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Helper to cache spot images and persist cache
  const cacheSpotImage = async (spotId, photoUrl) => {
    if (!photoUrl) return null;
    try {
      const cacheKey = `spotImageUri_${spotId}`;
      const cachedUri = await AsyncStorage.getItem(cacheKey);
      const cachedUrl = await AsyncStorage.getItem(`${cacheKey}_url`);
      if (cachedUri && cachedUrl === photoUrl) {
        setImageCache((prev) => {
          if (prev[spotId] === cachedUri) return prev;
          const updated = { ...prev, [spotId]: cachedUri };
          AsyncStorage.setItem("spotImageCache", JSON.stringify(updated));
          return updated;
        });
        return cachedUri;
      }
      const fileUri = FileSystem.cacheDirectory + `spot_${spotId}.jpg`;
      const downloadRes = await FileSystem.downloadAsync(photoUrl, fileUri);
      if (downloadRes.status === 200) {
        await AsyncStorage.setItem(cacheKey, downloadRes.uri);
        await AsyncStorage.setItem(`${cacheKey}_url`, photoUrl);
        setImageCache((prev) => {
          const updated = { ...prev, [spotId]: downloadRes.uri };
          AsyncStorage.setItem("spotImageCache", JSON.stringify(updated));
          return updated;
        });
        return downloadRes.uri;
      }
    } catch (e) {}
    return null;
  };

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
          const locationAlerts = locationAlertsDoc.exists()
            ? locationAlertsDoc.data().locationAlerts || []
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
                const ts = ratingData.timestamp.toMillis();
                if (ts >= windowStart) {
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
                const ts = ratingData.timestamp.toMillis();
                if (ts >= todayStartMillis) {
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
                ...todayRatings.map((r) => r.timestamp.toMillis())
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

          // Cache image if photoUrl exists
          let cachedUri = "";
          if (spotData.photoUrl) {
            cachedUri = await cacheSpotImage(docSnap.id, spotData.photoUrl);
          }
          return {
            id: docSnap.id,
            ...spotData,
            locationAlerts,
            photoUrl: spotData.photoUrl || "",
            cachedPhotoUri: cachedUri || spotData.photoUrl || "",
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
      // Build imageCache map
      const cacheMap = {};
      spots.forEach((spot) => {
        if (spot.cachedPhotoUri) cacheMap[spot.id] = spot.cachedPhotoUri;
      });
      setImageCache((prev) => {
        const merged = { ...prev, ...cacheMap };
        AsyncStorage.setItem("spotImageCache", JSON.stringify(merged));
        return merged;
      });
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

  return { studySpots, imageCache, isLoading, fetchStudySpots };
}
