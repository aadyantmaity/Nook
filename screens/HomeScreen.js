import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { studySpots } from "../mockData";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus } from "phosphor-react-native"; // Import icons
import { colors } from "../constants/colors"; // Import colors

function Filters({ filter, setFilter }) {
  return (
    <View
      style={{
        position: "relative",
        zIndex: 1,
        backgroundColor: "#FFFFFF",
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E0E0E0",
      }}
    >
      <View
        style={{
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            fontSize: 40,
            fontWeight: "bold",
            textAlign: "center",
            color: colors.purple,
            fontFamily: Platform.OS === "ios" ? "Helvetica" : "sans-serif",
            marginTop: 16,
          }}
        >
          Nook
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          paddingHorizontal: 16,
        }}
      >
        {["All", "Quiet", "WiFi", "Outlets", "Group-Friendly"].map(
          (label, index) => (
            <TouchableOpacity
              key={index}
              onPress={() =>
                setFilter(
                  label.toLowerCase() === "all" ? null : label.toLowerCase()
                )
              }
              style={{
                paddingVertical: 10,
                paddingHorizontal: 10,
                backgroundColor:
                  filter ===
                  (label.toLowerCase() === "all" ? null : label.toLowerCase())
                    ? colors.purple
                    : "#F0F0F0",
                borderRadius: 25,
                margin: 6,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text
                style={{
                  color:
                    filter ===
                    (label.toLowerCase() === "all" ? null : label.toLowerCase())
                      ? "#FFFFFF"
                      : colors.purple,
                  fontWeight: "bold",
                  fontSize: 13,
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </View>
  );
}

function StudySpots({ filteredSpots, navigation }) {
  return (
    <FlatList
      data={filteredSpots}
      key={2}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={{
        justifyContent: "space-between",
        marginBottom: 16,
      }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
      renderItem={({ item }) => (
        <View
          style={{
            width: "48%",
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("SpotDetail", { spotId: item.id })
            }
            style={{
              aspectRatio: 1,
              backgroundColor: "#F8F8F8",
            }}
          >
            <Image
              source={{ uri: item.image }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          </TouchableOpacity>
          <View style={{ padding: 12 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                marginBottom: 4,
                color: colors.purple,
              }}
            >
              {item.name}
            </Text>
            <Text
              style={{
                color: "#666666",
                fontSize: 12,
                fontStyle: "italic",
              }}
            >
              {item.tags.join(", ")}
            </Text>
          </View>
        </View>
      )}
    />
  );
}

export default function HomeScreen({ navigation }) {
  const [filter, setFilter] = useState(null);

  const filteredSpots = filter
    ? studySpots.filter((spot) => spot.tags.includes(filter))
    : studySpots;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <View style={{ flex: 1 }}>
        <Filters filter={filter} setFilter={setFilter} />
        <StudySpots filteredSpots={filteredSpots} navigation={navigation} />
        <TouchableOpacity
          onPress={() => navigation.navigate("AddSpot")}
          style={{
            position: "absolute",
            bottom: 16,
            right: 16,
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: colors.purple,
            borderRadius: 50,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Plus size={24} color="white" />
          <Text
            style={{
              color: "white",
              fontWeight: "bold",
              fontSize: 14,
              marginLeft: 8,
            }}
          >
            Add Spot
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
