import { useState, useEffect, useRef } from "react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function useSpotDetails(spotId) {
  const [spot, setSpot] = useState(null);
  const [addedByName, setAddedByName] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const unsubscribeRefs = useRef([]);

  const unsubscribeAll = () => {
    unsubscribeRefs.current.forEach((unsub) => {
      try {
        if (typeof unsub === "function" && unsub) unsub();
      } catch {}
    });
    unsubscribeRefs.current = [];
  };

  useEffect(() => {
    const fetchSpotDetails = async () => {
      try {
        const docRef = doc(db, "studySpots", spotId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const spotData = docSnap.data();
          setSpot(spotData);

          // Fetch username using addedBy user ID
          if (spotData.addedBy) {
            const userDoc = await getDoc(doc(db, "users", spotData.addedBy));
            if (userDoc.exists()) {
              const revealIdentity = spotData.revealIdentity;
              setAddedByName(
                revealIdentity
                  ? `${userDoc.data().firstName} ${userDoc.data().lastName}`
                  : "Anonymous"
              );
            } else {
              setAddedByName("Anonymous");
            }
          } else {
            setAddedByName("Anonymous");
          }

          // Fetch ratings for the spot
          const ratingsQuery = query(
            collection(db, "ratings"),
            where("spotId", "==", spotId)
          );
          unsubscribeAll();
          const unsubscribe = onSnapshot(ratingsQuery, (snapshot) => {
            const now = Timestamp.now().toMillis();
            const thirtyMinutesAgo = now - 30 * 60 * 1000;
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayStartMillis = todayStart.getTime();

            let recentRatings = [];
            let recentLastTimestamp = null;
            snapshot.forEach((doc) => {
              const data = doc.data();
              const ts = data.timestamp.toMillis();
              if (ts >= thirtyMinutesAgo) {
                recentRatings.push(data);
                if (!recentLastTimestamp || ts > recentLastTimestamp)
                  recentLastTimestamp = ts;
              }
            });

            let noiseRating,
              crowdRating,
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
              noiseRating = (noiseSum / recentRatings.length).toFixed(1);
              crowdRating = (crowdSum / recentRatings.length).toFixed(1);
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
                snapshot.forEach((doc) => {
                  const data = doc.data();
                  const ts = data.timestamp.toMillis();
                  if (ts >= windowStart) {
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
                  const ts = data.timestamp.toMillis();
                  if (ts >= todayStartMillis) {
                    todayRatings.push(data);
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
                noiseRating = (noiseSum / bestWindowRatings.length).toFixed(1);
                crowdRating = (crowdSum / bestWindowRatings.length).toFixed(1);
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
                noiseRating = (noiseSumDay / todayRatings.length).toFixed(1);
                crowdRating = (crowdSumDay / todayRatings.length).toFixed(1);
                lastUpdated = Math.max(
                  ...todayRatings.map((r) => r.timestamp.toMillis())
                );
                lastUpdatedType = "today";
                lastWindowHours = null;
              } else {
                noiseRating = "N/A";
                crowdRating = "N/A";
                lastUpdated = null;
                lastUpdatedType = null;
                lastWindowHours = null;
              }
            }

            setSpot((prev) => ({
              ...prev,
              ratings: {
                noise: noiseRating,
                crowd: crowdRating,
                lastUpdated,
                lastUpdatedType,
                lastWindowHours,
              },
            }));
          });
          unsubscribeRefs.current.push(unsubscribe);
        } else {
          setSpot(null);
        }
      } catch (error) {
        setSpot(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (spotId) fetchSpotDetails();
    return () => unsubscribeAll();
    // eslint-disable-next-line
  }, [spotId]);

  return { spot, addedByName, isLoading, setSpot };
}
