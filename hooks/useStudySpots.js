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
