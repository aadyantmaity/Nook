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

      const unsub = onSnapshot(allQuery, (allSnap) => {
        const allDocs = allSnap.docs;

        // Process each spot synchronously
        const spots = allDocs
          .map((docSnap) => {
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

            // Fetch locationAlerts for the spot - we'll get this from the spot data
            let locationAlerts = spotData.locationAlerts || [];
            locationAlerts = Array.isArray(locationAlerts)
              ? locationAlerts.map((a) =>
                  typeof a === "string"
                    ? { text: a, createdAt: null }
                    : { text: a.text, createdAt: a.createdAt ?? null }
                )
              : [];

            // --- Listen to overallRatings for this spot ---
            let averageOverallRating = 0;
            let overallRatingsCount = 0;
            let unsubOverall = null;
            try {
              const overallRatingsQuery = query(
                collection(db, "overallRatings"),
                where("spotId", "==", docSnap.id)
              );
              unsubOverall = onSnapshot(
                overallRatingsQuery,
                (overallRatingsSnapshot) => {
                  let sum = 0,
                    count = 0;
                  overallRatingsSnapshot.forEach((doc) => {
                    const data = doc.data();
                    sum += data.rating || 0;
                    count++;
                  });
                  averageOverallRating = count > 0 ? sum / count : 0;
                  overallRatingsCount = count;
                  // Update the spot in setStudySpots
                  setStudySpots((prevSpots) =>
                    prevSpots.map((s) =>
                      s.id === docSnap.id
                        ? {
                            ...s,
                            averageOverallRating,
                            overallRatingsCount,
                          }
                        : s
                    )
                  );
                }
              );
              unsubRefs.current.push(unsubOverall);
            } catch (e) {
              averageOverallRating = 0;
              overallRatingsCount = 0;
            }

            // --- Fetch noise and crowd ratings for this spot ---
            let averageNoise = "No rating yet";
            let averageCrowd = "No rating yet";
            let unsubRatings = null;
            try {
              const ratingsQuery = query(
                collection(db, "ratings"),
                where("spotId", "==", docSnap.id)
              );
              unsubRatings = onSnapshot(
                ratingsQuery,
                (ratingsSnapshot) => {
                  const now = Date.now();
                  const thirtyMinutesAgo = now - 30 * 60 * 1000;
                  const todayStart = new Date();
                  todayStart.setHours(0, 0, 0, 0);
                  const todayStartMillis = todayStart.getTime();

                  let recentRatings = [];
                  ratingsSnapshot.forEach((ratingDoc) => {
                    const ratingData = ratingDoc.data();
                    if (!ratingData.timestamp) return;
                    const ts = ratingData.timestamp.toMillis();
                    if (ts >= thirtyMinutesAgo) {
                      recentRatings.push(ratingData);
                    }
                  });

                  let noise, crowd;
                  if (recentRatings.length > 0) {
                    let noiseSum = 0, crowdSum = 0;
                    recentRatings.forEach((r) => {
                      noiseSum += r.noise;
                      crowdSum += r.crowd;
                    });
                    noise = noiseSum / recentRatings.length;
                    crowd = crowdSum / recentRatings.length;
                  } else {
                    // Try to find ratings from today
                    let todayRatings = [];
                    ratingsSnapshot.forEach((ratingDoc) => {
                      const ratingData = ratingDoc.data();
                      const ts = ratingData.timestamp ? ratingData.timestamp.toMillis() : null;
                      if (ts !== null && ts >= todayStartMillis) {
                        todayRatings.push(ratingData);
                      }
                    });
                    if (todayRatings.length > 0) {
                      let noiseSum = 0, crowdSum = 0;
                      todayRatings.forEach((r) => {
                        noiseSum += r.noise;
                        crowdSum += r.crowd;
                      });
                      noise = noiseSum / todayRatings.length;
                      crowd = crowdSum / todayRatings.length;
                    } else {
                      noise = "No rating yet";
                      crowd = "No rating yet";
                    }
                  }

                  // Update the spot in setStudySpots
                  setStudySpots((prevSpots) =>
                    prevSpots.map((s) =>
                      s.id === docSnap.id
                        ? {
                            ...s,
                            ratings: { noise, crowd },
                          }
                        : s
                    )
                  );
                }
              );
              unsubRefs.current.push(unsubRatings);
            } catch (e) {
              // Keep default values
            }

            // Hide ratings/alerts for private nooks
            if (spotData.privateNook) {
              return {
                id: docSnap.id,
                ...spotData,
                locationAlerts: [],
                photoUrl: spotData.photoUrl || "",
                cachedPhotoUri: spotData.photoUrl || "",
                averageOverallRating: 0,
                overallRatingsCount: 0,
                ratings: { noise: "N/A", crowd: "N/A" },
              };
            }

            return {
              id: docSnap.id,
              ...spotData,
              locationAlerts,
              photoUrl: spotData.photoUrl || "",
              cachedPhotoUri: spotData.photoUrl || "",
              averageOverallRating,
              overallRatingsCount,
              ratings: { noise: "No rating yet", crowd: "No rating yet" },
            };
          })
          .filter(Boolean);

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
