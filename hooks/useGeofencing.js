import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

// Helper function to calculate distance between two coordinates in meters
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

export default function useGeofencing(spotLocation, geofenceRadius = 100) {
  const [isWithinGeofence, setIsWithinGeofence] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Request location permission
  const requestLocationPermission = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'This app needs location access to enable live updates when you\'re near study spots. Please enable location permissions in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Location.openSettingsAsync() }
          ]
        );
        return false;
      }
      
      return true;
    } catch (err) {
      setError('Failed to request location permission');
      console.error('Location permission error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Get current user location
  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000,
      });
      
      setUserLocation(location.coords);
      return location.coords;
    } catch (err) {
      setError('Failed to get current location');
      console.error('Location error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user is within geofence
  const checkGeofence = async () => {
    if (!spotLocation || !spotLocation.latitude || !spotLocation.longitude) {
      setIsWithinGeofence(false);
      return false;
    }

    // Check permission first
    if (locationPermission !== 'granted') {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setIsWithinGeofence(false);
        return false;
      }
    }

    // Get current location
    const currentLocation = await getCurrentLocation();
    if (!currentLocation) {
      setIsWithinGeofence(false);
      return false;
    }

    // Calculate distance
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      spotLocation.latitude,
      spotLocation.longitude
    );

    const withinGeofence = distance <= geofenceRadius;
    setIsWithinGeofence(withinGeofence);
    
    return withinGeofence;
  };

  // Check permission status on mount
  useEffect(() => {
    const checkPermissionStatus = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        setLocationPermission(status);
      } catch (err) {
        console.error('Error checking location permission:', err);
      }
    };

    checkPermissionStatus();
  }, []);

  // Auto-check geofence when spot location changes
  useEffect(() => {
    if (spotLocation && locationPermission === 'granted') {
      checkGeofence();
    }
  }, [spotLocation, locationPermission]);

  return {
    isWithinGeofence,
    locationPermission,
    userLocation,
    isLoading,
    error,
    requestLocationPermission,
    getCurrentLocation,
    checkGeofence,
  };
}