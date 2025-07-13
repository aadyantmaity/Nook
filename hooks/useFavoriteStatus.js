import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

export default function useFavoriteStatus(spotId) {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !spotId) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (userDoc) => {
      if (userDoc.exists()) {
        const favs = userDoc.data().favorites || [];
        setIsFavorite(favs.includes(spotId));
      } else {
        setIsFavorite(false);
      }
    });
    return () => unsub();
  }, [spotId, auth.currentUser?.uid]);

  return isFavorite;
}
