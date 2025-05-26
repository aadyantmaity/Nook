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

import { ArrowLeft } from "phosphor-react-native"; // Import icons

const TAGS = ["quiet", "wifi", "outlets", "group-friendly", "outdoors"];

export default function AddSpotScreen({ navigation }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);

  const toggleTag = (tag) => {
    setSelectedTags((tags) =>
      tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]
    );
  };

  const handleSubmit = () => {
    // TODO: send to backend
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flex: 1, padding: 16, backgroundColor: "#fff" }}>
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
                backgroundColor: "#eee",
                borderRadius: 8,
              }}
            >
              <ArrowLeft size={20} color="black" />
              <Text style={{ marginLeft: 8 }}>Back to Home</Text>
            </TouchableOpacity>
          </View>

          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              marginBottom: 16,
              color: "#4B2E83",
            }}
          >
            Add a Study Spot
          </Text>

          <TextInput
            placeholder="Spot Name"
            value={name}
            onChangeText={setName}
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              backgroundColor: "#f9f9f9",
            }}
          />

          <TextInput
            placeholder="Location (address or lat,lng)"
            value={location}
            onChangeText={setLocation}
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              backgroundColor: "#f9f9f9",
            }}
          />

          <Text style={{ fontSize: 16, marginBottom: 8, color: "#4B2E83" }}>
            Tags:
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleTag(tag)}
                style={{
                  margin: 4,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  backgroundColor: selectedTags.includes(tag)
                    ? "#cce5ff"
                    : "#eee",
                  borderRadius: 20,
                }}
              >
                <Text style={{ color: "#4B2E83" }}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ marginTop: 24 }}>
            <Button title="Submit" onPress={handleSubmit} color="#4B2E83" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
