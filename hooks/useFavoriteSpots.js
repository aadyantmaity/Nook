import { useState, useEffect, useCallback } from "react";
import { auth, db } from "../firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";

export default function useFavoriteSpots() {
  const [favorites, setFavorites] = useState([]);
  const [favoriteSpots, setFavoriteSpots] = useState([]);
  const [favoriteSpotsLoading, setFavoriteSpotsLoading] = useState(true);
  const [cachedFavoriteSpotImages, setCachedFavoriteSpotImages] = useState({});

  // Helper to cache favorite spot images locally
  const cacheFavoriteSpotImage = async (spotId, photoUrl) => {
    if (!photoUrl) return null;
    try {
      const cacheKey = `favSpotImageUri_${spotId}`;
      const cachedUri = await AsyncStorage.getItem(cacheKey);
      const cachedUrl = await AsyncStorage.getItem(`${cacheKey}_url`);
      if (cachedUri && cachedUrl === photoUrl) {
        return cachedUri;
      }
      const fileUri = FileSystem.cacheDirectory + `fav_spot_${spotId}.jpg`;
      const downloadRes = await FileSystem.downloadAsync(photoUrl, fileUri);
      if (downloadRes.status === 200) {
        await AsyncStorage.setItem(cacheKey, downloadRes.uri);
        await AsyncStorage.setItem(`${cacheKey}_url`, photoUrl);
        return downloadRes.uri;
      }
    } catch (e) {}
    return null;
  };

  // Fetch favorite spots for the user
  const fetchFavoriteSpots = useCallback(async () => {
    setFavoriteSpotsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setFavoriteSpots([]);
        setFavoriteSpotsLoading(false);
        return;
      }
      const userDoc = await getDoc(doc(db, "users", user.uid));
      let favIds = [];
      if (userDoc.exists()) {
        favIds = userDoc.data().favorites || [];
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
          spots.push({
            id: docSnap.id,
            ...spotData,
          });
        }
      }
      setFavoriteSpots(spots);

      // Cache all images
      const cacheMap = {};
      await Promise.all(
        spots.map(async (spot) => {
          if (spot.photoUrl) {
            const uri = await cacheFavoriteSpotImage(spot.id, spot.photoUrl);
            if (uri) cacheMap[spot.id] = uri;
          }
        })
      );
      setCachedFavoriteSpotImages(cacheMap);
    } catch (e) {
      setFavoriteSpots([]);
    } finally {
      setFavoriteSpotsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavoriteSpots();
  }, [fetchFavoriteSpots]);

  return {
    favorites,
    favoriteSpots,
    favoriteSpotsLoading,
    cachedFavoriteSpotImages,
    fetchFavoriteSpots,
  };
}