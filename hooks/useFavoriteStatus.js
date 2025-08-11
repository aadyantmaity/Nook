import { useState, useEffect } from "react";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

export default function useFavoriteStatus(spotId) {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !spotId) {
      setIsFavorite(false);
      return;
    }

    // Check if the user has favorited this spot by looking at the favoritedBy subcollection
    const checkFavoriteStatus = async () => {
      try {
        const favoritedByDoc = await getDoc(
          doc(db, "studySpots", spotId, "favoritedBy", user.uid)
        );
        setIsFavorite(favoritedByDoc.exists());
      } catch (error) {
        console.error("Error checking favorite status:", error);
        setIsFavorite(false);
      }
    };

    checkFavoriteStatus();

    // Listen for changes to the favoritedBy document
    const unsub = onSnapshot(
      doc(db, "studySpots", spotId, "favoritedBy", user.uid),
      (doc) => {
        setIsFavorite(doc.exists());
      },
      (error) => {
        console.error("Error listening to favorite status:", error);
        setIsFavorite(false);
      }
    );

    return () => unsub();
  }, [spotId, auth.currentUser?.uid]);

  return isFavorite;
}
