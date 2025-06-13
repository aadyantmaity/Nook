import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function useImageCache() {
  const [imageCache, setImageCache] = useState({});

  useEffect(() => {
    const loadImageCache = async () => {
      try {
        const cacheRaw = await AsyncStorage.getItem("spotImageCache");
        if (cacheRaw) {
          setImageCache(JSON.parse(cacheRaw));
        }
      } catch {}
    };
    loadImageCache();
  }, []);

  const updateImageCache = (spotId, uri) => {
    setImageCache((prev) => {
      const updated = { ...prev, [spotId]: uri };
      AsyncStorage.setItem("spotImageCache", JSON.stringify(updated));
      return updated;
    });
  };

  return { imageCache, updateImageCache };
}
