import { useState, useCallback, useEffect } from "react";
import { auth, db } from "../firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

export default function useStudyStats(targetUid = null) {
  const [studyStats, setStudyStats] = useState({
    totalSessions: 0,
    favoriteSpotId: null,
    favoriteSpotName: "",
    totalTimeStudied: 0,
  });

  const fetchStudyStats = useCallback(async () => {
    // Accept targetUid, fallback to current user
    const user = auth.currentUser;
    const uid = targetUid || user?.uid;
    if (!uid) return;
    try {
      const q = collection(db, "users", uid, "focusSessions");
      const snapshot = await getDocs(q);
      let total = 0;
      let totalTimeStudied = 0;
      const spotCounts = {};
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (!d.isBreak && d.spotId && d.start && d.end) {
          total++;
          spotCounts[d.spotId] = (spotCounts[d.spotId] || 0) + 1;
          const start = d.start
            ? d.start.seconds
              ? d.start.seconds * 1000
              : d.start.toMillis()
            : null;
          const end = d.end
            ? d.end.seconds
              ? d.end.seconds * 1000
              : d.end.toMillis()
            : null;
          if (
            typeof start === "number" &&
            typeof end === "number" &&
            end > start
          ) {
            totalTimeStudied += end - start;
          }
        }
      });
      let favoriteSpotId = null;
      let maxCount = 0;
      Object.entries(spotCounts).forEach(([spotId, count]) => {
        if (count > maxCount) {
          favoriteSpotId = spotId;
          maxCount = count;
        }
      });
      let favoriteSpotName = "";
      if (favoriteSpotId) {
        const spotDoc = await getDoc(doc(db, "studySpots", favoriteSpotId));
        if (spotDoc.exists()) {
          const spot = spotDoc.data();
          favoriteSpotName = spot.buildingName || spot.name || "Unknown";
          if (spot.roomNumber)
            favoriteSpotName += ` - Floor ${spot.roomNumber}`;
        }
      }
      setStudyStats({
        totalSessions: total,
        favoriteSpotId,
        favoriteSpotName,
        totalTimeStudied,
      });
    } catch (e) {
      setStudyStats({
        totalSessions: 0,
        favoriteSpotId: null,
        favoriteSpotName: "",
        totalTimeStudied: 0,
      });
    }
  }, [targetUid]);

  useEffect(() => {
    fetchStudyStats();
  }, [fetchStudyStats]);

  return { studyStats, fetchStudyStats };
}
