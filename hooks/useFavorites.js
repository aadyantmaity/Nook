import { useState, useEffect } from "react";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function useFavorites() {
  const [favorites, setFavorites] = useState([]);
  const [favoriteGroups, setFavoriteGroups] = useState([]);

  useEffect(() => {
    const fetchFavorites = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setFavorites(userDoc.data().favorites || []);
          setFavoriteGroups(userDoc.data().favoriteGroups || []);
        }
      }
    };
    fetchFavorites();
  }, []);

  const toggleFavorite = async (spotId) => {
    const user = auth.currentUser;
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    try {
      if (favorites.includes(spotId)) {
        await updateDoc(userRef, {
          favorites: favorites.filter((f) => f !== spotId),
        });
        setFavorites(favorites.filter((f) => f !== spotId));
      } else {
        await updateDoc(userRef, { favorites: [...favorites, spotId] });
        setFavorites([...favorites, spotId]);
      }
    } catch (e) {
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

  return { favorites, toggleFavorite, favoriteGroups, toggleFavoriteGroup };
}
