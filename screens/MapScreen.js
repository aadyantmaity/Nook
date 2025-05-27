import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Button,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { colors } from "../constants/colors"; // Import colors
// Removed: import MapView, { Marker } from "react-native-maps";
import { studySpots } from "../mockData";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "phosphor-react-native"; // Import icons

export default function MapScreen({ navigation }) {
  const [selectedSpot, setSelectedSpot] = useState(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={{ flex: 1, padding: 16, backgroundColor: colors.white }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.navigate("Home")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 10,
              backgroundColor: colors.gray, // Light button background
              borderRadius: 8,
            }}
          >
            <ArrowLeft size={20} color={colors.black} />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              marginBottom: 12,
              color: colors.black, // Dark text
            }}
          >
            Study Spots
          </Text>
          {studySpots.map((spot) => (
            <TouchableOpacity
              key={spot.id}
              onPress={() => setSelectedSpot(spot)}
              style={{
                marginBottom: 12,
                padding: 12,
                backgroundColor: colors.gray, // Light card background
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  color: colors.black,
                }}
              >
                {spot.name}
              </Text>
              <Text style={{ color: colors.subtleText }}>
                {spot.location.address ||
                  `${spot.location.lat}, ${spot.location.lng}`}
              </Text>
              <Text style={{ color: colors.subtleText }}>
                Tags: {spot.tags.join(", ")}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Modal visible={!!selectedSpot} transparent animationType="slide">
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.3)",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                backgroundColor: colors.white,
                margin: 32,
                padding: 16,
                borderRadius: 8,
              }}
            >
              {selectedSpot && (
                <>
                  <Text style={{ fontSize: 20, fontWeight: "bold" }}>
                    {selectedSpot.name}
                  </Text>
                  <Text>Tags: {selectedSpot.tags.join(", ")}</Text>
                  <Text>
                    WiFi: {selectedSpot.ratings.wifi} | Noise:{" "}
                    {selectedSpot.ratings.noise}
                  </Text>
                  <Button
                    title="View Details"
                    onPress={() => {
                      navigation.navigate("SpotDetail", {
                        spotId: selectedSpot.id,
                      });
                      setSelectedSpot(null);
                    }}
                  />
                  <Button title="Close" onPress={() => setSelectedSpot(null)} />
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
