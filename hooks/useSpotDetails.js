import { useState, useEffect, useRef } from "react";
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

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
          // --- Filter out private nooks not owned by user or not shared ---
          const user = auth.currentUser;
          if (
            spotData.privateNook &&
            spotData.addedBy !== user?.uid &&
            !(
              Array.isArray(spotData.sharedWith) &&
              spotData.sharedWith.includes(user?.uid)
            )
          ) {
            setSpot(null);
            return;
          }
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

          // If private nook, skip ratings fetch and set to N/A
          if (spotData.privateNook) {
            setSpot((prev) => ({
              ...prev,
              ratings: { rating: "N/A", lastUpdated: null, lastUpdatedType: null, lastWindowHours: null },
            }));
            return;
          }

          // Fetch ratings from subcollection
          const ratingsRef = collection(db, "studySpots", spotId, "ratings");
          unsubscribeAll();
          const unsubscribe = onSnapshot(ratingsRef, (snapshot) => {
            const now = Timestamp.now().toMillis();
            const thirtyMinutesAgo = now - 30 * 60 * 1000;
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayStartMillis = todayStart.getTime();

            const getTs = (data) =>
              data.createdAt?.toMillis?.() ?? null;

            let recentRatings = [];
            let recentLastTimestamp = null;
            snapshot.forEach((doc) => {
              const data = doc.data();
              const ts = getTs(data);
              if (ts !== null && ts >= thirtyMinutesAgo) {
                recentRatings.push(data);
                if (!recentLastTimestamp || ts > recentLastTimestamp)
                  recentLastTimestamp = ts;
              }
            });

            let avgRating, lastUpdated, lastUpdatedType, lastWindowHours;

            if (recentRatings.length > 0) {
              avgRating = (recentRatings.reduce((s, r) => s + r.rating, 0) / recentRatings.length).toFixed(1);
              lastUpdated = recentLastTimestamp;
              lastUpdatedType = "recent";
              lastWindowHours = null;
            } else {
              let found = false;
              let bestWindowRatings = [];
              let lastRecentTimestamp = null;
              let bestWindow = null;
              for (let hours = 1; hours <= 6; hours++) {
                const windowStart = now - hours * 60 * 60 * 1000;
                let windowRatings = [];
                let windowLastTimestamp = null;
                snapshot.forEach((doc) => {
                  const data = doc.data();
                  const ts = getTs(data);
                  if (ts !== null && ts >= windowStart) {
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
                  const ts = getTs(data);
                  if (ts !== null && ts >= todayStartMillis) todayRatings.push(data);
                });
              }

              if (found && bestWindowRatings.length > 0) {
                avgRating = (bestWindowRatings.reduce((s, r) => s + r.rating, 0) / bestWindowRatings.length).toFixed(1);
                lastUpdated = lastRecentTimestamp;
                lastUpdatedType = "window";
                lastWindowHours = bestWindow;
              } else if (todayRatings.length > 0) {
                avgRating = (todayRatings.reduce((s, r) => s + r.rating, 0) / todayRatings.length).toFixed(1);
                lastUpdated = Math.max(...todayRatings.map((r) => getTs(r)).filter((v) => v !== null));
                lastUpdatedType = "today";
                lastWindowHours = null;
              } else {
                avgRating = "N/A";
                lastUpdated = null;
                lastUpdatedType = null;
                lastWindowHours = null;
              }
            }

            setSpot((prev) => ({
              ...prev,
              ratings: { rating: avgRating, lastUpdated, lastUpdatedType, lastWindowHours },
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
