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
              ratings: { noise: "N/A", crowd: "N/A", lastUpdated: null, lastUpdatedType: null, lastWindowHours: null },
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

            // Only use docs that have noise/crowd fields
            const allDocs = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              if (data.noise !== undefined && data.crowd !== undefined) {
                allDocs.push(data);
              }
            });

            function computeAvg(docs, field) {
              if (docs.length === 0) return "N/A";
              return (docs.reduce((s, r) => s + r[field], 0) / docs.length).toFixed(1);
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
                noiseAvg = "N/A";
                crowdAvg = "N/A";
                lastUpdated = null;
                lastUpdatedType = null;
                lastWindowHours = null;
              }
            }

            setSpot((prev) => ({
              ...prev,
              ratings: { noise: noiseAvg, crowd: crowdAvg, lastUpdated, lastUpdatedType, lastWindowHours },
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
