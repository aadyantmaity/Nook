import { useState, useEffect } from "react";
import { auth, db } from "../firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

export default function useFavorites() {
  const [favorites, setFavorites] = useState(new Set());
  const [favoriteGroups, setFavoriteGroups] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Listen to user's favorites from favoritedBy subcollections
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setFavorites(new Set());
      setFavoriteGroups([]);
      return;
    }

    // Listen to all study spots where the user is in the favoritedBy subcollection
    const unsubscribe = onSnapshot(
      collection(db, "studySpots"),
      async (snapshot) => {
        const userFavorites = new Set();

        // Check each study spot's favoritedBy subcollection
        for (const spotDoc of snapshot.docs) {
          try {
            const favoritedByDoc = await getDoc(
              doc(db, "studySpots", spotDoc.id, "favoritedBy", user.uid)
            );

            if (favoritedByDoc.exists()) {
              userFavorites.add(spotDoc.id);
            }
          } catch (error) {
            console.error(
              "Error checking favoritedBy for spot:",
              spotDoc.id,
              error
            );
          }
        }

        setFavorites(userFavorites);
      },
      (error) => {
        console.error("Error listening to study spots:", error);
      }
    );

    // Also fetch favorite groups from user document (keeping existing functionality)
    const fetchFavoriteGroups = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setFavoriteGroups(userDoc.data().favoriteGroups || []);
        }
      } catch (error) {
        console.error("Error fetching favorite groups:", error);
      }
    };

    fetchFavoriteGroups();

    return () => unsubscribe();
  }, [refreshTrigger]);

  const toggleFavorite = async (spotId) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const favoritedByRef = doc(
        db,
        "studySpots",
        spotId,
        "favoritedBy",
        user.uid
      );
      const favoritedByDoc = await getDoc(favoritedByRef);

      if (favoritedByDoc.exists()) {
        // Remove from favorites
        await deleteDoc(favoritedByRef);
        setFavorites((prev) => {
          const newSet = new Set(prev);
          newSet.delete(spotId);
          return newSet;
        });
      } else {
        // Add to favorites
        await setDoc(favoritedByRef, {
          favoritedAt: new Date(),
          userId: user.uid,
        });
        setFavorites((prev) => {
          const newSet = new Set(prev);
          newSet.add(spotId);
          return newSet;
        });
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      alert("Failed to update favorites.");
    }
  };

  const toggleFavoriteGroup = async (groupId) => {
    const user = auth.currentUser;
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    try {
      if (favoriteGroups.includes(groupId)) {
        await updateDoc(userRef, {
          favoriteGroups: favoriteGroups.filter((g) => g !== groupId),
        });
        setFavoriteGroups(favoriteGroups.filter((g) => g !== groupId));
      } else {
        await updateDoc(userRef, {
          favoriteGroups: [...favoriteGroups, groupId],
        });
        setFavoriteGroups([...favoriteGroups, groupId]);
      }
    } catch (e) {
      alert("Failed to update favorite groups.");
    }
  };

  const refetchFavorites = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return { favorites, toggleFavorite, favoriteGroups, toggleFavoriteGroup, refetchFavorites };
}
