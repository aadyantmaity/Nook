import { useState } from "react";

export default function useImageCache() {
  // No caching, always empty
  return { imageCache: {}, updateImageCache: () => {} };
}
