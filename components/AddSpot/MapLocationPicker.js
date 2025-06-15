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
} from "react-native";
import MapView, { Marker } from "react-native-maps";

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

  // Reset selectedLocation when modal is closed, and clear when opened
  useEffect(() => {
    if (!visible) {
      setSearch("");
      setSuggestions([]);
      // Do not reset selectedLocation here
    } else {
      setSelectedLocation(null); // Always clear selection when modal opens
      if (initialCoords) {
        // Optionally, you can prefill with initialCoords if you want
        // setSelectedLocation({
        //   latitude: initialCoords.latitude,
        //   longitude: initialCoords.longitude,
        //   name: "",
        //   display_name: "",
        //   placeType: "",
        // });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

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
      )}&format=json&limit=8&addressdetails=1&dedupe=1&normalizeaddress=1`;
      const res = await fetch(url);
      const data = await res.json();
      setSuggestions(Array.isArray(data) ? data : []);
    } catch (e) {
      setSuggestions([]);
    }
    setLoading(false);
  };

  const handleSuggestionPick = (item) => {
    setSearch(item.display_name);
    setSuggestions([]);
    const location = {
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={[styles.title, { color: themeColors.purple }]}>
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
            {suggestions.length > 0 && (
              <View style={styles.suggestionsBox}>
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
                      <Text style={styles.suggestionText} numberOfLines={2}>
                        {item.display_name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
            {/* Show map with pin if a location is selected and modal is visible */}
            {visible && selectedLocation && (
              <>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: selectedLocation.latitude,
                    longitude: selectedLocation.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  region={{
                    latitude: selectedLocation.latitude,
                    longitude: selectedLocation.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  pointerEvents="none"
                >
                  <Marker
                    coordinate={{
                      latitude: selectedLocation.latitude,
                      longitude: selectedLocation.longitude,
                    }}
                    title={selectedLocation.name}
                    description={selectedLocation.display_name}
                  />
                </MapView>
                <Text style={{ marginBottom: 8, color: "#444", fontWeight: "bold", textAlign: "center" }}>
                  {selectedLocation.display_name
                    ? selectedLocation.display_name.split(",").slice(0, 3).join(", ")
                    : "No address"}
                </Text>
              </>
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
                <Text style={{ color: themeColors.purple, fontWeight: "bold" }}>
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
                  }}
                >
                  Pick Location
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
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
  },
  loadingText: {
    marginLeft: 8,
    color: "#888",
  },
  suggestionsBox: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 8,
    zIndex: 999,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: "#ccc",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    marginBottom: 8,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  suggestionText: {
    fontSize: 14,
    color: "#222",
  },
  map: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginBottom: 12,
    marginTop: 8,
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
});
