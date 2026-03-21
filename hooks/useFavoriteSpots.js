import { useState, useEffect, useCallback } from "react";
import { auth, db } from "../firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  getDocs,
} from "firebase/firestore";

export default function useFavoriteSpots(targetUid = null) {
  const [favorites, setFavorites] = useState([]);
  const [favoriteSpots, setFavoriteSpots] = useState([]);
  const [favoriteSpotsLoading, setFavoriteSpotsLoading] = useState(true);

  // Fetch favorite spots for the user
  const fetchFavoriteSpots = useCallback(async () => {
    setFavoriteSpotsLoading(true);
    try {
      const user = auth.currentUser;
      const uid = targetUid || user?.uid;
      const isOwnProfile = !targetUid || targetUid === user?.uid;

      if (!uid) {
        setFavoriteSpots([]);
        setFavoriteSpotsLoading(false);
        return;
      }

      // Get all study spots and check which ones the user has favorited
      const spotsSnapshot = await getDocs(collection(db, "studySpots"));
      const favIds = [];

      // Check each spot's favoritedBy subcollection for the user
      for (const spotDoc of spotsSnapshot.docs) {
        try {
          const favoritedByDoc = await getDoc(
            doc(db, "studySpots", spotDoc.id, "favoritedBy", uid)
          );

          if (favoritedByDoc.exists()) {
            favIds.push(spotDoc.id);
          }
        } catch (error) {
          console.error(
            "Error checking favoritedBy for spot:",
            spotDoc.id,
            error
          );
        }
      }

      setFavorites(favIds);

      if (favIds.length === 0) {
        setFavoriteSpots([]);
        setFavoriteSpotsLoading(false);
        return;
      }

      // Fetch all favorite spots in parallel
      const spotDocs = await Promise.all(
        favIds.map((id) => getDoc(doc(db, "studySpots", id)))
      );
      const spots = [];
      for (let i = 0; i < spotDocs.length; i++) {
        const docSnap = spotDocs[i];
        if (docSnap.exists()) {
          const spotData = docSnap.data();
          // --- Filter out private nooks when viewing other users' profiles ---
          if (
            spotData.privateNook &&
            !isOwnProfile &&
            spotData.addedBy !== user?.uid &&
            !(
              Array.isArray(spotData.sharedWith) &&
              spotData.sharedWith.includes(user?.uid)
            )
          ) {
            continue;
          }
          // Hide ratings for private nooks
          let ratings = spotData.privateNook
            ? {
                noise: "N/A",
                crowd: "N/A",
                lastUpdated: null,
                lastUpdatedType: null,
                lastWindowHours: null,
              }
            : {
                noise: "N/A",
                crowd: "N/A",
                lastUpdated: null,
                lastUpdatedType: null,
                lastWindowHours: null,
              };
          spots.push({
            id: docSnap.id,
            ...spotData,
            ratings,
            cachedPhotoUri: spotData.photoUrl || "",
          });
        }
      }
      setFavoriteSpots(spots);
    } catch (e) {
      setFavoriteSpots([]);
    } finally {
      setFavoriteSpotsLoading(false);
    }
  }, [targetUid]);

  useEffect(() => {
    fetchFavoriteSpots();
  }, [fetchFavoriteSpots]);

  return {
    favorites,
    favoriteSpots,
    favoriteSpotsLoading,
    cachedFavoriteSpotImages: {}, // always empty, not used
    fetchFavoriteSpots,
  };
}
