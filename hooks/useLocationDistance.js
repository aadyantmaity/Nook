import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

/**
 * Custom hook to check if user is within distance threshold of a spot
 * @param {Object} spot - The spot object with coordinates
 * @param {number} maxDistanceMeters - Maximum allowed distance in meters (default: 100)
 * @returns {Object} - { isWithinDistance, isLoading, error, distance }
 */
export default function useLocationDistance(spot, maxDistanceMeters = 100) {
  const [isWithinDistance, setIsWithinDistance] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [distance, setDistance] = useState(null);

  // Helper function to calculate distance between two coordinates
  const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371000; // Earth's radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  useEffect(() => {
    const checkDistance = async () => {
      // If no spot or no coordinates, allow interaction
      if (!spot || !spot.coordinates || 
          typeof spot.coordinates.latitude !== 'number' || 
          typeof spot.coordinates.longitude !== 'number') {
        setIsWithinDistance(true);
        setError(null);
        setDistance(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied');
          setIsWithinDistance(false);
          setIsLoading(false);
          return;
        }

        // Get current location
        const location = await Location.getCurrentPositionAsync({});
        const userLat = location.coords.latitude;
        const userLon = location.coords.longitude;
        const spotLat = spot.coordinates.latitude;
        const spotLon = spot.coordinates.longitude;

        // Calculate distance
        const calculatedDistance = getDistanceMeters(userLat, userLon, spotLat, spotLon);
        setDistance(calculatedDistance);
        
        // Check if within distance threshold
        const withinDistance = calculatedDistance <= maxDistanceMeters;
        setIsWithinDistance(withinDistance);

      } catch (err) {
        console.error('Error checking location distance:', err);
        setError('Failed to get location');
        setIsWithinDistance(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkDistance();
  }, [spot, maxDistanceMeters]);

  return {
    isWithinDistance,
    isLoading,
    error,
    distance
  };
}
