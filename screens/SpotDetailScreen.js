import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { studySpots } from "../mockData";
import {
  ArrowLeft,
  SpeakerHigh,
  Check,
  X,
  UsersThree,
  Clock,
  Star,
} from "phosphor-react-native"; // Import icons
import { colors } from "../constants/colors"; // Import colors

function renderStars(rating) {
  return (
    <View style={{ flexDirection: "row", marginTop: 8 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={20}
          color={star <= rating ? colors.white : colors.gray}
          weight={star <= rating ? "fill" : "regular"}
          style={{ marginHorizontal: 2 }}
        />
      ))}
    </View>
  );
}

export default function SpotDetailScreen({ route, navigation }) {
  const { spotId } = route.params;
  const spot = studySpots.find((s) => s.id === spotId);
  const [showLiveUpdate, setShowLiveUpdate] = useState(false);

  if (!spot) return <Text>Spot not found</Text>;

  // Add default values for missing fields
  const tags = spot.tags || [];
  const operatingHours = spot.operatingHours || "Not Available";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
        <View style={{ flex: 1, backgroundColor: colors.white }}>
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
                backgroundColor: colors.purple,
                borderRadius: 8,
                shadowColor: colors.black,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
              }}
            >
              <ArrowLeft size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
          <Image
            source={{ uri: spot.image }}
            style={{
              width: "100%",
              height: 200,
              borderRadius: 8,
              marginBottom: 16,
            }}
            resizeMode="cover"
          />
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              marginBottom: 16,
              color: colors.purple,
            }}
          >
            {spot.name}
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <View
              style={{
                flex: 1,
                alignItems: "center",
                padding: 16,
                backgroundColor: colors.purple,
                borderRadius: 8,
                marginRight: 8,
              }}
            >
              <SpeakerHigh size={32} color={colors.white} />
              <Text style={{ color: colors.white, fontSize: 14, marginTop: 8 }}>
                Current Noise Level
              </Text>
              {renderStars(spot.ratings.noise)}
            </View>
            <View
              style={{
                flex: 1,
                alignItems: "center",
                padding: 16,
                backgroundColor: colors.purple,
                borderRadius: 8,
                marginLeft: 8,
              }}
            >
              <UsersThree size={32} color={colors.white} />
              <Text style={{ color: colors.white, fontSize: 14, marginTop: 8 }}>
                Current Crowd Level
              </Text>
              {renderStars(spot.ratings.crowd)}
            </View>
          </View>
          <View
            style={{
              alignItems: "center",
              padding: 16,
              backgroundColor: colors.purple,
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <Clock size={32} color={colors.white} />
            <Text style={{ color: colors.white, fontSize: 16, marginTop: 8 }}>
              Operating Hours
            </Text>
            <Text
              style={{ color: colors.white, fontSize: 20, fontWeight: "bold" }}
            >
              {operatingHours}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginBottom: 16,
              marginTop: 8,
            }}
          >
            {tags.map((tag, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: colors.purple,
                  paddingHorizontal: 16, // Increased padding for larger size
                  paddingVertical: 8, // Increased padding for larger size
                  borderRadius: 20,
                  marginRight: 8,
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: colors.white, fontSize: 16 }}>{tag}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            onPress={() => setShowLiveUpdate(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: colors.purple,
              borderRadius: 25,
              marginTop: 16,
              alignSelf: "center",
              shadowColor: colors.black,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <SpeakerHigh size={20} color={colors.white} />
            <Text
              style={{
                marginLeft: 8,
                color: colors.white,
                fontWeight: "bold",
                fontSize: 16,
              }}
            >
              Live Update
            </Text>
          </TouchableOpacity>
          <LiveUpdateModal
            visible={showLiveUpdate}
            onClose={() => setShowLiveUpdate(false)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LiveUpdateModal({ visible, onClose }) {
  const [noiseLevel, setNoiseLevel] = useState(3);
  const [crowdLevel, setCrowdLevel] = useState(3);
  const [description, setDescription] = useState("");

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
            backgroundColor: colors.white,
            margin: 32,
            padding: 16,
            borderRadius: 8,
          }}
        >
          <Text style={{ marginBottom: 4, fontSize: 16 }}>
            Noise Level (1-5):
          </Text>
          <View style={{ flexDirection: "row", marginBottom: 16 }}>
            {[1, 2, 3, 4, 5].map((level) => (
              <TouchableOpacity
                key={level}
                onPress={() => setNoiseLevel(level)}
                style={{
                  padding: 10,
                  marginHorizontal: 4,
                  backgroundColor:
                    noiseLevel === level ? colors.purple : colors.gray,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    color: noiseLevel === level ? colors.white : colors.black,
                  }}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{ marginBottom: 4, fontSize: 16 }}>
            Crowd Level (1-5):
          </Text>
          <View style={{ flexDirection: "row", marginBottom: 16 }}>
            {[1, 2, 3, 4, 5].map((level) => (
              <TouchableOpacity
                key={level}
                onPress={() => setCrowdLevel(level)}
                style={{
                  padding: 10,
                  marginHorizontal: 4,
                  backgroundColor:
                    crowdLevel === level ? colors.purple : colors.gray,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    color: crowdLevel === level ? colors.white : colors.black,
                  }}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{ marginBottom: 4, fontSize: 16 }}>
            Description (optional):
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            style={{
              borderWidth: 1,
              borderColor: colors.darkGray,
              borderRadius: 8,
              padding: 8,
              marginBottom: 16,
              backgroundColor: colors.white,
              color: colors.black,
            }}
            multiline
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                marginRight: 8,
                padding: 12,
                backgroundColor: colors.purple,
                borderRadius: 8,
              }}
            >
              <Check size={20} color={colors.white} />
              <Text
                style={{
                  marginLeft: 8,
                  color: colors.white,
                  fontWeight: "bold",
                }}
              >
                Submit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                marginLeft: 8,
                padding: 12,
                backgroundColor: colors.gray,
                borderRadius: 8,
              }}
            >
              <X size={20} color={colors.black} />
              <Text
                style={{
                  marginLeft: 8,
                  color: colors.black,
                  fontWeight: "bold",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
