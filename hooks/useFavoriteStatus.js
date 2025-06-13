import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

export default function useFavoriteStatus(spotId) {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const checkFavorite = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const favs = userDoc.data().favorites || [];
          setIsFavorite(favs.includes(spotId));
        }
      }
    };
    if (spotId && auth.currentUser) checkFavorite();
  }, [spotId, auth.currentUser]);

  return isFavorite;
}
