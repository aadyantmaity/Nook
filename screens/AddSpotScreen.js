import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";

import { ArrowLeft, Check } from "phosphor-react-native"; // Import icons
import { colors } from "../constants/colors"; // Correctly import colors

const TAGS = ["quiet", "wifi", "outlets", "group-friendly", "outdoors"];

export default function AddSpotScreen({ navigation }) {
  const [name, setName] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [huskyCardNeeded, setHuskyCardNeeded] = useState(false);
  const [department, setDepartment] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);

  const toggleTag = (tag) => {
    setSelectedTags((tags) =>
      tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]
    );
  };

  const handleSubmit = () => {
    // TODO: send to backend
    const spotDetails = {
      name,
      buildingName,
      roomNumber,
      huskyCardNeeded,
      department: huskyCardNeeded ? department : null,
    };
    console.log(spotDetails); // Debugging output
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, backgroundColor: "#FFFFFF" }}
      >
        <View style={{ flex: 1, padding: 16, backgroundColor: "#FFFFFF" }}>
          {/* Light background */}
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
                backgroundColor: "#4B2E83", // Light button background
                borderRadius: 8,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
              }}
            >
              <ArrowLeft size={20} color="white" />
            </TouchableOpacity>
          </View>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              marginBottom: 16,
              color: colors.purple, // Dark text
            }}
          >
            Add a Study Spot
          </Text>
          <TextInput
            placeholder="Spot Name"
            placeholderTextColor="#666666" // Subtle placeholder
            value={name}
            onChangeText={setName}
            style={{
              borderWidth: 1,
              borderColor: "#CCCCCC", // Light border
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              backgroundColor: "#FFFFFF", // Light input background
              color: "#000000", // Dark text
            }}
          />
          <TextInput
            placeholder="UW Building Name"
            placeholderTextColor="#666666"
            value={buildingName}
            onChangeText={setBuildingName}
            style={{
              borderWidth: 1,
              borderColor: "#CCCCCC",
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              backgroundColor: "#FFFFFF",
              color: "#000000",
            }}
          />
          <TextInput
            placeholder="Room Number (if applicable)"
            placeholderTextColor="#666666"
            value={roomNumber}
            onChangeText={setRoomNumber}
            style={{
              borderWidth: 1,
              borderColor: "#CCCCCC",
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              backgroundColor: "#FFFFFF",
              color: "#000000",
            }}
          />
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{ fontSize: 16, marginBottom: 8, color: colors.purple }}
            >
              Husky Card Needed:
            </Text>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <TouchableOpacity
                onPress={() => setHuskyCardNeeded(false)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  padding: 12,
                  marginRight: 8,
                  backgroundColor: !huskyCardNeeded ? "#4B2E83" : "#F0F0F0",
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: !huskyCardNeeded ? "white" : "#000000" }}>
                  No
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setHuskyCardNeeded(true)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  padding: 12,
                  marginLeft: 8,
                  backgroundColor: huskyCardNeeded ? "#4B2E83" : "#F0F0F0",
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: huskyCardNeeded ? "white" : "#000000" }}>
                  Yes
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {huskyCardNeeded && (
            <TextInput
              placeholder="Department (if applicable)"
              placeholderTextColor="#666666"
              value={department}
              onChangeText={setDepartment}
              style={{
                borderWidth: 1,
                borderColor: "#CCCCCC",
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                backgroundColor: "#FFFFFF",
                color: "#000000",
              }}
            />
          )}
          <Text style={{ fontSize: 16, marginBottom: 8, color: colors.purple }}>
            Tags:
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center", // Center align the tags
              marginBottom: 16,
            }}
          >
            {TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleTag(tag)}
                style={{
                  margin: 6, // Add more spacing between tags
                  paddingHorizontal: 16, // Increase horizontal padding
                  paddingVertical: 10, // Increase vertical padding
                  backgroundColor: selectedTags.includes(tag)
                    ? colors.purple
                    : "#F0F0F0", // Light unselected background
                  borderRadius: 25, // Make the tags more rounded
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2, // Add subtle shadow for depth
                }}
              >
                <Text
                  style={{
                    color: selectedTags.includes(tag) ? "white" : "#000000",
                    fontSize: 14, // Slightly increase font size
                    fontWeight: "bold", // Make the text bold
                  }}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ marginTop: 24, alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => setShowReview(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center", // Center content horizontally
                paddingVertical: 12, // Increase vertical padding
                paddingHorizontal: 16, // Increase horizontal padding
                backgroundColor: "#4B2E83",
                borderRadius: 25, // Make the button more rounded
                marginTop: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                alignSelf: "center",
                elevation: 3, // Add elevation for a subtle shadow
              }}
            >
              <Check size={20} color="white" />
              <Text
                style={{
                  marginLeft: 8,
                  color: "white",
                  fontWeight: "bold", // Make the text bold
                  fontSize: 16, // Slightly increase font size
                }}
              >
                Add Spot
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
