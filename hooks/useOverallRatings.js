import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  setDoc,
  addDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

export default function useOverallRatings(spotId) {
  const [userOverallRating, setUserOverallRating] = useState(0);
  const [averageOverallRating, setAverageOverallRating] = useState(0);
  const [overallRatingsCount, setOverallRatingsCount] = useState(0);
  const [pendingOverallRating, setPendingOverallRating] = useState(0);
  const [isSubmittingOverall, setIsSubmittingOverall] = useState(false);

  useEffect(() => {
    if (!spotId || !auth.currentUser) return;
    // --- Check if private nook ---
    (async () => {
      const spotDoc = await getDocs(
        query(collection(db, "studySpots"), where("__name__", "==", spotId))
      );
      if (!spotDoc.empty && spotDoc.docs[0].data().privateNook) {
        setAverageOverallRating(0);
        setOverallRatingsCount(0);
        setUserOverallRating(0);
        setPendingOverallRating(0);
        return;
      }
      const fetchOverallRatings = async () => {
        const ratingsQuery = query(
          collection(db, "overallRatings"),
          where("spotId", "==", spotId)
        );
        const snapshot = await getDocs(ratingsQuery);
        let sum = 0,
          count = 0,
          userRating = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          sum += data.rating || 0;
          count++;
          if (data.userId === auth.currentUser.uid) {
            userRating = data.rating;
          }
        });
        setAverageOverallRating(count > 0 ? sum / count : 0);
        setOverallRatingsCount(count);
        setUserOverallRating(userRating);
        setPendingOverallRating(userRating);
      };
      fetchOverallRatings();
      const unsubscribe = onSnapshot(
        query(collection(db, "overallRatings"), where("spotId", "==", spotId)),
        (snapshot) => {
          let sum = 0,
            count = 0,
            userRating = 0;
          snapshot.forEach((doc) => {
            const data = doc.data();
            sum += data.rating || 0;
            count++;
            if (data.userId === auth.currentUser.uid) {
              userRating = data.rating;
            }
          });
          setAverageOverallRating(count > 0 ? sum / count : 0);
          setOverallRatingsCount(count);
          setUserOverallRating(userRating);
          setPendingOverallRating(userRating);
        }
      );
      return () => unsubscribe();
    })();
  }, [spotId]);

  const submitOverallRating = async () => {
    // --- Prevent submit for private nooks ---
    const spotDoc = await getDocs(
      query(collection(db, "studySpots"), where("__name__", "==", spotId))
    );
    if (!spotDoc.empty && spotDoc.docs[0].data().privateNook) return;
    if (
      pendingOverallRating === 0 ||
      pendingOverallRating === userOverallRating
    )
      return;
    setIsSubmittingOverall(true);
    try {
      const ratingsQuery = query(
        collection(db, "overallRatings"),
        where("spotId", "==", spotId),
        where("userId", "==", auth.currentUser.uid)
      );
      const snapshot = await getDocs(ratingsQuery);
      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        await setDoc(
          doc(db, "overallRatings", docId),
          {
            spotId,
            userId: auth.currentUser.uid,
            rating: pendingOverallRating,
            timestamp: Timestamp.now(),
          },
          { merge: true }
        );
      } else {
        await addDoc(collection(db, "overallRatings"), {
          spotId,
          userId: auth.currentUser.uid,
          rating: pendingOverallRating,
          timestamp: Timestamp.now(),
        });
      }
    } catch (e) {}
    setIsSubmittingOverall(false);
  };

  return {
    userOverallRating,
    averageOverallRating,
    overallRatingsCount,
    pendingOverallRating,
    setPendingOverallRating,
    isSubmittingOverall,
    submitOverallRating,
  };
}
