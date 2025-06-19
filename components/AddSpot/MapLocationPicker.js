import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

// Utility to safely parse latitude/longitude
function parseCoordinate(value) {
  // Use parseFloat for robust parsing of string numbers
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

export default function MapLocationPicker({
  visible,
  onClose,
  onPick,
  themeColors,
  initialCoords,
}) {
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [coordError, setCoordError] = useState(false);

  // Reset selectedLocation when modal is closed, or set from initialCoords
  useEffect(() => {
    if (!visible) {
      setSearch("");
      setSuggestions([]);
      setSelectedLocation(null);
      setCoordError(false);
    } else {
      if (initialCoords && initialCoords.latitude && initialCoords.longitude) {
        const latitude = parseCoordinate(initialCoords.latitude);
        const longitude = parseCoordinate(initialCoords.longitude);
        if (latitude === null || longitude === null) {
          setCoordError(true);
          setSelectedLocation(null);
        } else {
          setCoordError(false);
          setSelectedLocation({
            latitude,
            longitude,
            name: initialCoords.name || "",
            display_name: initialCoords.display_name || "",
            placeType: initialCoords.placeType || "",
          });
          setSearch(initialCoords.display_name || "");
        }
      } else {
        setSelectedLocation(null);
        setSearch("");
        setCoordError(false);
      }
      setSuggestions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // --- NEW: Clear selected location if input is cleared ---
  useEffect(() => {
    if (search.trim() === "") {
      setSelectedLocation(null);
    }
  }, [search]);

  const LOCATIONIQ_API_KEY = "pk.f73f676cc77d848a6d4d0c0003335e59";

  const fetchSuggestions = async (text) => {
    const trimmedText = text.trim();
    setSearch(text);
    if (trimmedText.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const url = `https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(
        trimmedText
      )}&format=json&limit=8&addressdetails=1&dedupe=1&normalizeaddress=1&countrycodes=us`;
      const res = await fetch(url);
      const data = await res.json();
      setSuggestions(Array.isArray(data) ? data : []);
    } catch (e) {
      setSuggestions([]);
    }
    setLoading(false);
  };

  const handleSuggestionPick = (item) => {
    Keyboard.dismiss();
    setSearch(item.display_name);
    setSuggestions([]);
    const latitude = parseCoordinate(item.lat);
    const longitude = parseCoordinate(item.lon);
    // Debug: log the coordinates
    // console.log("Picked coords:", latitude, longitude, item.display_name);
    if (latitude === null || longitude === null) {
      setCoordError(true);
      setSelectedLocation(null);
      return;
    }
    setCoordError(false);
    const location = {
      latitude,
      longitude,
      name: item.display_name.split(",")[0].trim(),
      display_name: item.display_name,
      placeType: item.type || "",
    };
    setSelectedLocation(location);
    // Do not call onPick here
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <Text
                style={[
                  styles.title,
                  { color: themeColors.purple, fontFamily: "CarosSoft" },
                ]}
              >
                Search Location
              </Text>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search for a place..."
                  value={search}
                  onChangeText={fetchSuggestions}
                  placeholderTextColor="#888"
                  autoCorrect={false}
                  autoCapitalize="none"
                  clearButtonMode="while-editing"
                />
                {loading && <Text style={styles.loadingText}>...</Text>}
              </View>
              {/* Suggestions box always shown if search has 3+ chars */}
              {search.trim().length >= 3 && !selectedLocation && (
                <View style={styles.suggestionsBox}>
                  {loading ? (
                    <View style={styles.suggestionsLoadingBox}>
                      <Text
                        style={{
                          color: "#888",
                          textAlign: "center",
                          marginTop: 8,
                          fontFamily: "CarosSoft",
                        }}
                      >
                        Loading...
                      </Text>
                    </View>
                  ) : suggestions.length > 0 ? (
                    <FlatList
                      keyboardShouldPersistTaps="handled"
                      data={suggestions}
                      keyExtractor={(item) =>
                        item.place_id?.toString() ||
                        item.osm_id?.toString() ||
                        Math.random().toString()
                      }
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.suggestionItem}
                          onPress={() => handleSuggestionPick(item)}
                        >
                          <Text
                            style={[
                              styles.suggestionText,
                              { fontFamily: "CarosSoft" },
                            ]}
                            numberOfLines={2}
                          >
                            {item.display_name}
                          </Text>
                        </TouchableOpacity>
                      )}
                      style={{ flex: 1 }}
                    />
                  ) : (
                    // Only show "No results found" if no location is selected
                    <View style={styles.suggestionsLoadingBox}>
                      <Text
                        style={{
                          color: "#888",
                          textAlign: "center",
                          marginTop: 8,
                          fontFamily: "CarosSoft",
                        }}
                      >
                        No results found
                      </Text>
                    </View>
                  )}
                </View>
              )}
              {/* Map preview for selected location */}
              {selectedLocation && (
                <View style={styles.mapPreviewContainer}>
                  <MapView
                    style={styles.mapPreview}
                    region={{
                      latitude: selectedLocation.latitude,
                      longitude: selectedLocation.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                    pointerEvents="none"
                    mapType="satellite"
                  >
                    <Marker
                      coordinate={{
                        latitude: selectedLocation.latitude,
                        longitude: selectedLocation.longitude,
                      }}
                    />
                  </MapView>
                  <Text
                    style={[
                      styles.mapPreviewLabel,
                      { fontFamily: "CarosSoft" },
                    ]}
                    numberOfLines={2}
                  >
                    {selectedLocation.name}
                  </Text>
                </View>
              )}
              {/* Show error if coordinates are invalid */}
              {coordError && (
                <Text
                  style={{
                    color: "red",
                    marginVertical: 8,
                    textAlign: "center",
                    fontFamily: "CarosSoft",
                  }}
                >
                  Could not find a valid location for this address.
                </Text>
              )}
              {/* Pick Location button */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={onClose}
                  style={[
                    styles.button,
                    {
                      backgroundColor: themeColors.white,
                      borderColor: themeColors.purple,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: themeColors.purple,
                      fontWeight: "bold",
                      fontFamily: "CarosSoft",
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (selectedLocation && onPick) onPick(selectedLocation);
                  }}
                  style={[
                    styles.button,
                    {
                      backgroundColor: selectedLocation
                        ? themeColors.purple
                        : "#ccc",
                    },
                  ]}
                  disabled={!selectedLocation}
                >
                  <Text
                    style={{
                      color: selectedLocation ? themeColors.white : "#888",
                      fontWeight: "bold",
                      fontFamily: "CarosSoft",
                    }}
                  >
                    Pick Location
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  modal: {
    width: "92%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    elevation: 5,
    zIndex: 101,
    overflow: "visible",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    fontFamily: "CarosSoft",
  },
  searchContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    marginTop: 2,
    zIndex: 2,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: "#222",
    fontFamily: "CarosSoft",
  },
  loadingText: {
    marginLeft: 8,
    color: "#888",
    fontFamily: "CarosSoft",
  },
  suggestionsBox: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 8,
    zIndex: 999,
    height: 200, // Fixed height to prevent resizing
    borderWidth: 1,
    borderColor: "#ccc",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  suggestionsLoadingBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 40,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  suggestionText: {
    fontSize: 14,
    color: "#222",
    fontFamily: "CarosSoft",
  },
  buttonRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    marginTop: 4,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 6,
  },
  mapPreviewContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 8,
  },
  mapPreview: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    overflow: "hidden",
  },
  mapPreviewLabel: {
    marginTop: 6,
    fontSize: 13,
    color: "#444",
    textAlign: "center",
    width: "100%",
    fontFamily: "CarosSoft",
  },
});
