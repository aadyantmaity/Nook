import React from "react";
import { TouchableOpacity, View, Text, Image } from "react-native";
import { MapPin } from "phosphor-react-native";

export default function FavoriteSpotCard({
  spot,
  cachedImage,
  themeColors,
  onPress,
  getLastUpdatedLabel,
}) {
  return (
    <TouchableOpacity
      style={{
        backgroundColor: themeColors.white,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
        borderColor: themeColors.black,
        borderWidth: 0.5,
      }}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {spot.photoUrl ? (
        <View
          style={{
            width: 75,
            height: 75,
            borderRadius: 8,
            overflow: "hidden",
            marginRight: 14,
            backgroundColor: "#EEE",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Image
            source={{
              uri: cachedImage || spot.photoUrl,
            }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>
      ) : (
        <View
          style={{
            backgroundColor: themeColors.purple,
            borderRadius: 8,
            width: 75,
            height: 75,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
          }}
        >
          <MapPin size={45} color={themeColors.white} weight="bold" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            color: themeColors.black,
            marginBottom: 6,
          }}
        >
          {spot.buildingName}
          {spot.roomNumber && (
            <Text
              style={{
                fontSize: 18,
                color: themeColors.black,
                fontWeight: "bold",
              }}
            >
              {" - Floor "}
              {spot.roomNumber}
            </Text>
          )}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {spot.tags && spot.tags.length > 0
            ? [...spot.tags]
                .sort((a, b) => String(a).localeCompare(String(b)))
                .slice(0, 3)
                .map((tag, idx) => (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: themeColors.purple,
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      marginRight: 6,
                      marginTop: 2,
                    }}
                  >
                    <Text
                      style={{
                        color: themeColors.white,
                        fontSize: 11,
                        fontWeight: "bold",
                      }}
                    >
                      {tag}
                    </Text>
                  </View>
                ))
            : null}
          {spot.tags && spot.tags.length > 3 && (
            <Text
              style={{
                color: themeColors.purple,
                fontSize: 11,
                fontWeight: "bold",
                marginTop: 2,
              }}
            >
              +{spot.tags.length - 3} more
            </Text>
          )}
        </View>
        <View style={{ flexDirection: "row", marginTop: 6 }}>
          <Text
            style={{
              color: themeColors.purple,
              fontSize: 13,
              fontWeight: "bold",
              marginRight: 12,
            }}
          >
            Noise: {getNoiseLabel(spot.ratings?.noise)}
          </Text>
          <Text
            style={{
              color: themeColors.purple,
              fontSize: 13,
              fontWeight: "bold",
            }}
          >
            Crowd: {getCrowdLabel(spot.ratings?.crowd)}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 11,
            color: themeColors.darkGray,
            marginTop: 2,
            textAlign: "right",
          }}
        >
          {getLastUpdatedLabel(spot.ratings)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// Add helper functions:
function getNoiseLabel(avg) {
  if (avg === "N/A" || avg === "No rating yet" || avg == null) return "N/A";
  if (typeof avg === "string") avg = parseFloat(avg);
  if (isNaN(avg)) return "N/A";
  if (avg < 0.5) return "Silent";
  if (avg < 1.5) return "Buzz";
  return "Loud";
}
function getCrowdLabel(avg) {
  if (avg === "N/A" || avg === "No rating yet" || avg == null) return "N/A";
  if (typeof avg === "string") avg = parseFloat(avg);
  if (isNaN(avg)) return "N/A";
  if (avg < 0.5) return "Empty";
  if (avg < 1.5) return "Busy";
  return "Full";
}
