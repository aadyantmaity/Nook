import { useState, useEffect, useRef } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

export default function useStudySpots() {
  const [studySpots, setStudySpots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const unsubRefs = useRef([]);

  const fetchStudySpots = async () => {
    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      // --- Use onSnapshot for real-time updates ---
      const allQuery = collection(db, "studySpots");
      // Remove previous listeners
      unsubRefs.current.forEach((unsub) => {
        try {
          unsub();
        } catch {}
      });
      unsubRefs.current = [];

      const unsub = onSnapshot(allQuery, async (allSnap) => {
        const allDocs = allSnap.docs;

        // For each spot, set up a ratings listener
        const spotPromises = allDocs.map(async (docSnap) => {
          const spotData = docSnap.data();
          // --- Filter out private nooks not owned by user or not shared ---
          if (
            spotData.privateNook &&
            spotData.addedBy !== user.uid &&
            !(
              Array.isArray(spotData.sharedWith) &&
              spotData.sharedWith.includes(user.uid)
            )
          ) {
            return null;
          }

          // Fetch locationAlerts for the spot
          const locationAlertsRef = doc(db, "studySpots", docSnap.id);
          const locationAlertsDoc = await getDoc(locationAlertsRef);
          let locationAlerts = locationAlertsDoc.exists()
            ? locationAlertsDoc.data().locationAlerts || []
            : [];
          locationAlerts = Array.isArray(locationAlerts)
            ? locationAlerts.map((a) =>
                typeof a === "string"
                  ? { text: a, createdAt: null }
                  : { text: a.text, createdAt: a.createdAt ?? null }
              )
            : [];

          // --- Listen to ratings for live updates ---
          return new Promise((resolve) => {
            const ratingsQuery = query(
              collection(db, "ratings"),
              where("spotId", "==", docSnap.id)
            );
            const unsubRating = onSnapshot(
              ratingsQuery,
              async (ratingsSnapshot) => {
                // For Odegaard: aggregate tableAvailability (most recent)
                let tableAvailability = undefined;
                if (
                  (spotData.buildingName || spotData.name || "")
                    .toLowerCase()
                    .includes("odegaard")
                ) {
                  let latestTable = null;
                  let latestTs = null;
                  ratingsSnapshot.forEach((ratingDoc) => {
                    const ratingData = ratingDoc.data();
                    if (
                      typeof ratingData.tableAvailability !== "undefined" &&
                      ratingData.timestamp
                    ) {
                      const ts = ratingData.timestamp.toMillis();
                      if (latestTs === null || ts > latestTs) {
                        latestTable = ratingData.tableAvailability;
                        latestTs = ts;
                      }
                    }
                  });
                  // --- Clear tableAvailability if no ratings from today ---
                  let hasTodayRating = false;
                  ratingsSnapshot.forEach((ratingDoc) => {
                    const ratingData = ratingDoc.data();
                    if (
                      ratingData.timestamp &&
                      ratingData.timestamp.toMillis() >= todayStartMillis
                    ) {
                      hasTodayRating = true;
                    }
                  });
                  tableAvailability = hasTodayRating ? latestTable : "N/A";
                }

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
                        .map((r) =>
                          r.timestamp ? r.timestamp.toMillis() : null
                        )
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

                // --- Fetch overall ratings for this spot ---
                let averageOverallRating = 0;
                let overallRatingsCount = 0;
                try {
                  const { collection, getDocs, query, where } = await import(
                    "firebase/firestore"
                  );
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

                // Hide ratings/alerts for private nooks
                if (spotData.privateNook) {
                  resolve({
                    id: docSnap.id,
                    ...spotData,
                    locationAlerts: [],
                    photoUrl: spotData.photoUrl || "",
                    cachedPhotoUri: spotData.photoUrl || "",
                    ratings: {
                      noise: "N/A",
                      crowd: "N/A",
                      lastUpdated: null,
                      lastUpdatedType: null,
                      lastWindowHours: null,
                      ...(typeof tableAvailability !== "undefined"
                        ? { tableAvailability }
                        : {}),
                    },
                    averageOverallRating: 0,
                    overallRatingsCount: 0,
                  });
                  return;
                }

                resolve({
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
                    ...(typeof tableAvailability !== "undefined"
                      ? { tableAvailability }
                      : {}),
                  },
                  averageOverallRating,
                  overallRatingsCount,
                });
              }
            );
            unsubRefs.current.push(unsubRating);
          });
        });

        // Wait for all spot promises to resolve
        const spots = (await Promise.all(spotPromises)).filter(Boolean);
        setStudySpots(spots);
        setIsLoading(false);
      });

      unsubRefs.current.push(unsub);
    } catch (error) {
      console.error("Error fetching study spots:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudySpots();
    return () => {
      unsubRefs.current.forEach((unsub) => {
        try {
          unsub();
        } catch {}
      });
      unsubRefs.current = [];
    };
  }, []);

  return { studySpots, isLoading, fetchStudySpots };
}
