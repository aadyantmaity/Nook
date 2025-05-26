import React, { useState } from "react";
import {
  View,
  Text,
  Button,
  FlatList,
  Modal,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { studySpots } from "../mockData";
import { ArrowLeft, Star } from "phosphor-react-native"; // Import icons

export default function SpotDetailScreen({ route, navigation }) {
  const { spotId } = route.params;
  const spot = studySpots.find((s) => s.id === spotId);
  const [showReview, setShowReview] = useState(false);

  if (!spot) return <Text>Spot not found</Text>;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 16, backgroundColor: "#f9f9f9" }}>
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
          {spot.name}
        </Text>
        <Text style={{ fontSize: 16, color: "#4B2E83", marginBottom: 8 }}>
          Tags: {spot.tags.join(", ")}
        </Text>
        <Text style={{ fontSize: 16, color: "#4B2E83", marginBottom: 8 }}>
          Noise Level: {spot.ratings.noise}
        </Text>
        <Text style={{ fontSize: 16, color: "#4B2E83", marginBottom: 8 }}>
          WiFi: {spot.ratings.wifi ? "Available" : "Not Available"}
        </Text>
        <Text style={{ fontSize: 16, color: "#4B2E83", marginBottom: 8 }}>
          Outlets: {spot.ratings.outlets ? "Available" : "Not Available"}
        </Text>
        <TouchableOpacity
          onPress={() => setShowReview(true)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 10,
            backgroundColor: "#4B2E83",
            borderRadius: 8,
            marginTop: 16,
          }}
        >
          <Star size={20} color="white" />
          <Text style={{ marginLeft: 8, color: "white" }}>
            Submit Rating/Review
          </Text>
        </TouchableOpacity>
        <Text style={{ marginTop: 16, fontWeight: "bold", color: "#4B2E83" }}>
          User Reviews
        </Text>
        <FlatList
          data={spot.reviews}
          keyExtractor={(_, idx) => idx.toString()}
          renderItem={({ item }) => (
            <View
              style={{
                marginVertical: 4,
                padding: 8,
                backgroundColor: "#fafafa",
                borderRadius: 8,
              }}
            >
              <Text style={{ fontWeight: "bold", color: "#4B2E83" }}>
                {item.user}
              </Text>
              <Text style={{ color: "#4B2E83" }}>Rating: {item.rating}</Text>
              <Text style={{ color: "#4B2E83" }}>{item.text}</Text>
            </View>
          )}
        />
        <ReviewModal
          visible={showReview}
          onClose={() => setShowReview(false)}
        />
      </View>
    </SafeAreaView>
  );
}

// Simple mock review modal
function ReviewModal({ visible, onClose }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            margin: 32,
            padding: 16,
            borderRadius: 8,
          }}
        >
          <Text style={{ fontWeight: "bold" }}>Submit Review</Text>
          <Text>Rating (1-5):</Text>
          <TextInput
            keyboardType="numeric"
            value={String(rating)}
            onChangeText={(v) => setRating(Number(v))}
            style={{ borderWidth: 1, marginVertical: 8, padding: 4 }}
          />
          <Text>Review (optional):</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            style={{ borderWidth: 1, marginVertical: 8, padding: 4 }}
            multiline
          />
          <Button title="Submit" onPress={onClose} />
          <Button title="Cancel" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
