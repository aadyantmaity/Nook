import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  Platform,
} from "react-native";
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from "react-native-maps";
import { auth } from "../../firebaseConfig";

// Helper: Haversine distance in meters
function getDistance(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Group spots within 30 meters
function clusterSpots(spots, threshold = 30) {
  const clusters = [];
  const used = new Set();
  for (let i = 0; i < spots.length; i++) {
    if (used.has(i)) continue;
    const cluster = [spots[i]];
    used.add(i);
    for (let j = i + 1; j < spots.length; j++) {
      if (used.has(j)) continue;
      const d = getDistance(
        spots[i].coordinates.latitude,
        spots[i].coordinates.longitude,
        spots[j].coordinates.latitude,
        spots[j].coordinates.longitude
      );
      if (d < threshold) {
        cluster.push(spots[j]);
        used.add(j);
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

export default function StudySpotsMapView({
  spots,
  navigation,
  themeColors,
  containerStyle,
}) {
  const mapRef = useRef();
  const [region, setRegion] = useState(null);

  // Filter spots with coordinates
  const spotsWithCoords = Array.isArray(spots)
    ? spots.filter(
        (s) =>
          s.coordinates &&
          typeof s.coordinates.latitude === "number" &&
          typeof s.coordinates.longitude === "number"
      )
    : [];

  // Default region: center on first spot or UW campus
  const defaultRegion =
    spotsWithCoords.length > 0
      ? {
          latitude: spotsWithCoords[0].coordinates.latitude,
          longitude: spotsWithCoords[0].coordinates.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }
      : {
          latitude: 47.655548, // UW Seattle
          longitude: -122.3032,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        };

  // Calculate square size (90% of screen width)
  const screenWidth = Dimensions.get("window").width;
  // Instead of 90%, use full width minus 32px (16px padding on each side)
  const mapSize = Math.floor(screenWidth - 32);

  // --- Cluster spots ---
  const clusters = clusterSpots(spotsWithCoords);

  // --- Favorite spot IDs ---
  const favoriteIds = Array.isArray(spots)
    ? spots.filter((s) => s.isFavorite).map((s) => s.id)
    : [];

  // --- Nook summary stats ---
  const totalNooks = spotsWithCoords.length;
  // Only count private nooks owned by the current user
  const privateNooks = spotsWithCoords.filter(
    (s) => s.privateNook && s.addedBy === auth.currentUser?.uid
  ).length;
  // Count nooks with alerts today
  const today = new Date();
  function isSameDay(dateObj) {
    if (!dateObj) return false;
    const d = new Date(dateObj);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  }
  const nooksWithAlertsToday = spotsWithCoords.filter((s) => {
    if (!Array.isArray(s.locationAlerts)) return false;
    return s.locationAlerts.some((a) => {
      const createdAt =
        typeof a === "string"
          ? null
          : a.createdAt?.toDate
          ? a.createdAt.toDate()
          : a.createdAt;
      return createdAt && isSameDay(createdAt);
    });
  }).length;

  // Helper to zoom to cluster
  const zoomToCluster = (cluster) => {
    if (!mapRef.current || cluster.length === 0) return;
    if (cluster.length === 1) return;
    const lats = cluster.map((s) => s.coordinates.latitude);
    const lons = cluster.map((s) => s.coordinates.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    mapRef.current.animateToRegion({
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max(0.002, (maxLat - minLat) * 2.5),
      longitudeDelta: Math.max(0.002, (maxLon - minLon) * 2.5),
    });
  };

  return (
    <>
      <View
        style={[
          {
            alignSelf: "center",
            width: mapSize,
            height: mapSize,
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor: themeColors.gray,
          },
          containerStyle,
        ]}
      >
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={defaultRegion}
          region={region || undefined}
          onRegionChangeComplete={setRegion}
          showsUserLocation={true}
          {...(Platform.OS === "android" ? { provider: PROVIDER_GOOGLE } : {})}
          mapType="satellite"
          showsCompass={true}
          rotateEnabled={true}
        >
          {clusters.map((cluster, idx) =>
            cluster.length === 1 ? (
              <Marker
                key={cluster[0].id}
                coordinate={{
                  latitude: cluster[0].coordinates.latitude,
                  longitude: cluster[0].coordinates.longitude,
                }}
                pinColor={themeColors.orange}
              >
                <Callout
                  onPress={() =>
                    navigation({
                      spotId: cluster[0].id,
                      view: "map",
                    })
                  }
                  style={{ minWidth: 120 }}
                >
                  <View>
                    <Text
                      style={{
                        fontWeight: "bold",
                        color: themeColors.purple,
                        fontFamily: "CarosSoft",
                      }}
                    >
                      {cluster[0].buildingName}
                      {cluster[0].roomNumber
                        ? ` - Floor ${cluster[0].roomNumber}`
                        : ""}
                    </Text>
                    <Text
                      style={{
                        color: themeColors.orange,
                        fontSize: 12,
                        marginTop: 2,
                        fontFamily: "CarosSoft",
                      }}
                    >
                      Tap for details
                    </Text>
                  </View>
                </Callout>
              </Marker>
            ) : (
              <Marker
                key={"cluster_" + idx}
                coordinate={{
                  latitude:
                    cluster.reduce(
                      (sum, s) => sum + s.coordinates.latitude,
                      0
                    ) / cluster.length,
                  longitude:
                    cluster.reduce(
                      (sum, s) => sum + s.coordinates.longitude,
                      0
                    ) / cluster.length,
                }}
                tracksViewChanges={false}
                pinColor={themeColors.orange}
                onPress={() => zoomToCluster(cluster)}
              >
                <View
                  style={{
                    backgroundColor: themeColors.purple,
                    borderRadius: 30,
                    padding: 8,
                    borderWidth: 2,
                    borderColor: themeColors.white,
                    minWidth: 44,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: themeColors.white,
                      fontWeight: "bold",
                      fontSize: 18,
                      fontFamily: "CarosSoft",
                    }}
                  >
                    {cluster.length}
                  </Text>
                </View>
              </Marker>
            )
          )}
        </MapView>
        {spotsWithCoords.length === 0 && (
          <View
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              right: 0,
              alignItems: "center",
            }}
          >
            <Text style={{ color: themeColors.darkGray }}>
              No nooks with map locations yet.
            </Text>
          </View>
        )}
        {/* Legend removed */}
      </View>
      {/* --- Nook summary panel below the map --- */}
      <View
        style={{
          marginTop: 12,
          marginBottom: 8,
          alignSelf: "center",
          width: mapSize,
          backgroundColor: themeColors.white,
          borderRadius: 12,
          padding: 14,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 2,
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text
            style={{
              color: themeColors.purple,
              fontWeight: "bold",
              fontSize: 16,
              fontFamily: "CarosSoft",
            }}
          >
            {totalNooks}
          </Text>
          <Text
            style={{
              color: themeColors.darkGray,
              fontSize: 13,
              fontFamily: "CarosSoft",
            }}
          >
            Nooks
          </Text>
        </View>
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text
            style={{
              color: themeColors.purple,
              fontWeight: "bold",
              fontSize: 16,
              fontFamily: "CarosSoft",
            }}
          >
            {privateNooks}
          </Text>
          <Text
            style={{
              color: themeColors.darkGray,
              fontSize: 13,
              fontFamily: "CarosSoft",
            }}
          >
            Private
          </Text>
        </View>
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text
            style={{
              color: themeColors.purple,
              fontWeight: "bold",
              fontSize: 16,
              fontFamily: "CarosSoft",
            }}
          >
            {nooksWithAlertsToday}
          </Text>
          <Text
            style={{
              color: themeColors.darkGray,
              fontSize: 13,
              fontFamily: "CarosSoft",
            }}
          >
            Alerts Today
          </Text>
        </View>
      </View>
    </>
  );
}
