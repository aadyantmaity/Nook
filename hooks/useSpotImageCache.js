import { useState, useEffect } from "react";

export default function useSpotImageCache(spotId, photoUrl) {
  const [cachedPhotoUri, setCachedPhotoUri] = useState(null);

  useEffect(() => {
    setCachedPhotoUri(photoUrl || null);
  }, [spotId, photoUrl]);

  return cachedPhotoUri;
}
