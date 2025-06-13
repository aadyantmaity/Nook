import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";

export default function useSpotImageCache(spotId, photoUrl) {
  const [cachedPhotoUri, setCachedPhotoUri] = useState(null);

  useEffect(() => {
    const cacheSpotImage = async () => {
      if (!photoUrl) {
        setCachedPhotoUri(null);
        return;
      }
      try {
        const cacheKey = `spotImageUri_${spotId}`;
        const cachedUri = await AsyncStorage.getItem(cacheKey);
        const cachedUrl = await AsyncStorage.getItem(`${cacheKey}_url`);
        if (cachedUri && cachedUrl === photoUrl) {
          setCachedPhotoUri(cachedUri);
          return;
        }
        const fileUri = FileSystem.cacheDirectory + `spot_${spotId}.jpg`;
        const downloadRes = await FileSystem.downloadAsync(photoUrl, fileUri);
        if (downloadRes.status === 200) {
          await AsyncStorage.setItem(cacheKey, downloadRes.uri);
          await AsyncStorage.setItem(`${cacheKey}_url`, photoUrl);
          setCachedPhotoUri(downloadRes.uri);
        } else {
          setCachedPhotoUri(null);
        }
      } catch (e) {
        setCachedPhotoUri(null);
      }
    };
    if (photoUrl) cacheSpotImage();
    else setCachedPhotoUri(null);
  }, [spotId, photoUrl]);

  return cachedPhotoUri;
}