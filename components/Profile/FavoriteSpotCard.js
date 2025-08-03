import React from "react";
import { TouchableOpacity, View, Text, Image } from "react-native";
import { MapPin, Star, LockKey } from "phosphor-react-native";

export default function FavoriteSpotCard({
  spot,
  cachedImage,
  themeColors,
  onPress,
  getLastUpdatedLabel,
  style,
}) {
  // Use the same label logic as RatingsDisplay
  function getNoiseLabel(avg) {
    if (avg === "N/A" || avg === "No rating yet" || avg == null) return "N/A";
    if (typeof avg === "string") {
      const normalized = avg.trim().toLowerCase();
      if (["silent", "buzz", "loud"].includes(normalized)) {
        return avg.charAt(0).toUpperCase() + avg.slice(1).toLowerCase();
      }
      avg = parseFloat(avg);
    }
    if (isNaN(avg)) return "N/A";
    if (avg < 0.5) return "Silent";
    if (avg < 1.5) return "Buzz";
    return "Loud";
  }
  function getCrowdLabel(avg) {
    if (avg === "N/A" || avg === "No rating yet" || avg == null) return "N/A";
    if (typeof avg === "string") {
      const normalized = avg.trim().toLowerCase();
      if (["empty", "light", "busy"].includes(normalized)) {
        return avg.charAt(0).toUpperCase() + avg.slice(1).toLowerCase();
      }
      avg = parseFloat(avg);
    }
    if (isNaN(avg)) return "N/A";
    if (avg < 0.5) return "Empty";
    if (avg < 1.5) return "Light";
    return "Busy";
  }

  return (
    <TouchableOpacity
      style={[
        {
          backgroundColor: themeColors.white,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 8,
          flexDirection: "row",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 3,
          elevation: 2,
          borderColor: themeColors.black,
          borderWidth: 0.5,
          position: "relative",
          marginRight: 16,
        },
        style,
      ]}
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
          <MapPin size={45} color={themeColors.white} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: themeColors.black,
              fontFamily: "CarosSoft",
            }}
          >
            {spot.buildingName}
            {spot.roomNumber && (
              <Text
                style={{
                  fontSize: 18,
                  color: themeColors.black,
                  fontWeight: "bold",
                  fontFamily: "CarosSoft",
                }}
              >
                {" - Floor "}
                {spot.roomNumber}
              </Text>
            )}
          </Text>
          {spot.privateNook && (
            <LockKey
              size={18}
              color={themeColors.purple}
              weight="fill"
              style={{
                marginLeft: 8,
                alignSelf: "center",
              }}
            />
          )}
        </View>
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
                        fontFamily: "CarosSoft",
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
                fontFamily: "CarosSoft",
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
              fontFamily: "CarosSoft",
            }}
          >
            Noise: {getNoiseLabel(spot.ratings?.noise)}
          </Text>
          <Text
            style={{
              color: themeColors.purple,
              fontSize: 13,
              fontWeight: "bold",
              fontFamily: "CarosSoft",
            }}
          >
            Crowd: {getCrowdLabel(spot.ratings?.crowd)}
          </Text>
        </View>
        {/* Table availability for Odegaard */}
        {(spot.buildingName || spot.name || "")
          .toLowerCase()
          .includes("odegaard") &&
          spot.ratings &&
          typeof spot.ratings.tableAvailability !== "undefined" && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 4,
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: themeColors.purple,
                  fontWeight: "bold",
                  fontFamily: "CarosSoft",
                }}
              >
                Tables Open:{" "}
                {(() => {
                  switch (spot.ratings.tableAvailability) {
                    case 0:
                      return "0";
                    case 1:
                      return "1-3";
                    case 2:
                      return "4-6";
                    case 3:
                      return "7+";
                    default:
                      return "N/A";
                  }
                })()}
              </Text>
            </View>
          )}

        <Text
          style={{
            fontSize: 11,
            color: themeColors.darkGray,
            marginTop: 2,
            textAlign: "right",
            fontFamily: "CarosSoft",
          }}
        >
          {getLastUpdatedLabel(spot.ratings || {})}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
