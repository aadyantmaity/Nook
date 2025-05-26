import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { studySpots } from "../mockData";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus /*, MapPin */ } from "phosphor-react-native"; // Import icons

export default function HomeScreen({ navigation }) {
  const [filter, setFilter] = useState(null);

  const filteredSpots = filter
    ? studySpots.filter((spot) => spot.tags.includes(filter))
    : studySpots;

  const renderHeader = () => (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginVertical: 16,
        }}
      >
        {["All", "Quiet", "WiFi", "Outlets"].map((label, index) => (
          <TouchableOpacity
            key={index}
            onPress={() =>
              setFilter(
                label.toLowerCase() === "all" ? null : label.toLowerCase()
              )
            }
            style={{
              paddingVertical: 8,
              paddingHorizontal: 16,
              backgroundColor:
                filter ===
                (label.toLowerCase() === "all" ? null : label.toLowerCase())
                  ? "#4B2E83"
                  : "#f0f0f0",
              borderRadius: 20,
              marginRight: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Text
              style={{
                color:
                  filter ===
                  (label.toLowerCase() === "all" ? null : label.toLowerCase())
                    ? "#fff"
                    : "#000",
                fontWeight: "bold",
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        <Text
          style={{
            fontSize: 40,
            fontWeight: "bold",
            textAlign: "center",
            marginVertical: 16,
            color: "#4B2E83",
          }}
        >
          Nook
        </Text>
        <FlatList
          data={filteredSpots}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("SpotDetail", { spotId: item.id })
              }
              style={{
                backgroundColor: "#fff",
                marginBottom: 12,
                borderRadius: 8,
                padding: 16,
                elevation: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  marginBottom: 4,
                  color: "#4B2E83",
                }}
              >
                {item.name}
              </Text>
              <Text style={{ color: "#4B2E83" }}>{item.tags.join(", ")}</Text>
            </TouchableOpacity>
          )}
        />
        <TouchableOpacity
          onPress={() => navigation.navigate("AddSpot")}
          style={{
            position: "absolute",
            bottom: 16,
            right: 16,
            flexDirection: "row",
            alignItems: "center",
            padding: 10,
            backgroundColor: "#4B2E83",
            borderRadius: 50,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
