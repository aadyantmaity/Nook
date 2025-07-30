import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Heart, Warning, Star } from "phosphor-react-native";

export default function StudySpotCard({
  spot,
  isFavorite,
  onToggleFavorite,
  onPress,
  onWarningPress,
  themeColors,
  getLastUpdatedLabel, // <-- add this prop
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        padding: 16,
        marginBottom: 12,
        backgroundColor: themeColors.white,
        borderRadius: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        position: "relative",
        borderColor: themeColors.black,
        borderWidth: 0.5,
      }}
      activeOpacity={0.9}
    >
      {/* Badge Icon: Warning for alerts */}
      {(() => {
        // --- Filter today's alerts only ---
        const today = new Date();
        const isSameDay = (dateObj) => {
          if (!dateObj) return false;
          const d = new Date(dateObj);
          return (
            d.getFullYear() === today.getFullYear() &&
            d.getMonth() === today.getMonth() &&
            d.getDate() === today.getDate()
          );
        };
        const parsedAlerts = Array.isArray(spot.locationAlerts)
          ? spot.locationAlerts.map((a) =>
              typeof a === "string"
                ? { text: a, createdAt: null }
                : { text: a.text, createdAt: a.createdAt ?? null }
            )
          : [];
        const todaysAlerts = parsedAlerts.filter(
          (a) =>
            a.createdAt &&
            isSameDay(
              typeof a.createdAt === "object" && a.createdAt.toDate
                ? a.createdAt.toDate()
                : a.createdAt
            )
        );
        if (todaysAlerts.length === 0) return null;
        return (
          <TouchableOpacity
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              zIndex: 20,
              backgroundColor: themeColors.white,
              borderRadius: 20,
              padding: 4,
              borderWidth: 0.5,
              borderColor: themeColors.red,
              shadowColor: themeColors.red,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.18,
              shadowRadius: 4,
              elevation: 6,
              width: 38,
              height: 38,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={onWarningPress}
            activeOpacity={0.8}
          >
            <Warning size={24} color={themeColors.red} weight="fill" />
            <View
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                backgroundColor: themeColors.orange,
                borderRadius: 10,
                paddingHorizontal: 5,
                paddingVertical: 1,
                minWidth: 18,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: themeColors.white,
                zIndex: 21,
              }}
            >
              <Text
                style={{
                  color: themeColors.white,
                  fontSize: 11,
                  fontWeight: "bold",
                  textAlign: "center",
                  fontFamily: "CarosSoft",
                }}
              >
                {todaysAlerts.length}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })()}

      {/* Image */}
      <View
        style={{
          width: "100%",
          height: 140,
          backgroundColor: themeColors.darkGray || "#EEE",
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          marginBottom: 12,
        }}
      >
        {spot.cachedPhotoUri || spot.photoUrl ? (
          <Image
            source={{
              uri: spot.cachedPhotoUri ? spot.cachedPhotoUri : spot.photoUrl,
            }}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 8,
            }}
            resizeMode="cover"
          />
        ) : (
          <Text style={{ color: themeColors.black, fontFamily: "CarosSoft" }}>
            No Image
          </Text>
        )}
      </View>

      {/* Heart icon for favorite */}
      <TouchableOpacity
        onPress={onToggleFavorite}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 20,
          backgroundColor: themeColors.white,
          borderRadius: 20,
          padding: 4,
          borderWidth: 0.5,
          borderColor: themeColors.black,
        }}
        onPressOut={(e) => e.stopPropagation && e.stopPropagation()}
      >
        <Heart
          size={28}
          color={themeColors.purple}
          weight={isFavorite ? "fill" : "regular"}
        />
      </TouchableOpacity>

      {/* Spot name and room */}
      <Text
        style={{
          fontSize: 18,
          fontWeight: "bold",
          color: themeColors.black,
          marginBottom: 6,
          flexDirection: "row",
          alignItems: "center",
          fontFamily: "CarosSoft",
        }}
      >
        {spot.name}
        {spot.privateNook && (
          <Text
            style={{
              fontSize: 18,
              color: themeColors.black,
              fontWeight: "bold",
              marginLeft: 8,
              fontFamily: "CarosSoft",
            }}
          >
            {" \u2022 Private"}
          </Text>
        )}
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

      {/* Husky Card/Department info */}
      {!spot.privateNook && (spot.huskyCardNeeded || spot.department) && (
        <Text
          style={{
            fontSize: 13,
            color: spot.huskyCardNeeded
              ? themeColors.red
              : themeColors.darkGray,
            marginBottom: 8,
            marginTop: 2,
            fontWeight: spot.huskyCardNeeded ? "bold" : "normal",
            fontFamily: "CarosSoft",
          }}
        >
          {spot.huskyCardNeeded && "Husky Card Required"}
          {spot.huskyCardNeeded && spot.department && (
            <Text
              style={{
                color: themeColors.darkGray,
                fontWeight: "normal",
                fontFamily: "CarosSoft",
              }}
            >
              {" "}
              •{" "}
            </Text>
          )}
          {spot.department && (
            <Text
              style={{
                color: themeColors.darkGray,
                fontWeight: "normal",
                fontFamily: "CarosSoft",
              }}
            >
              Department: {spot.department}
            </Text>
          )}
        </Text>
      )}

      {/* Tags */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          marginBottom: 8,
          gap: 6,
        }}
      >
        {spot.tags && spot.tags.length > 0 ? (
          [...spot.tags]
            .sort((a, b) => String(a).localeCompare(String(b)))
            .map((tag, idx) => (
              <View
                key={idx}
                style={{
                  backgroundColor: themeColors.purple,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  marginRight: 0,
                  marginBottom: 3,
                }}
              >
                <Text
                  style={{
                    color: themeColors.white || "#fff",
                    fontSize: 12,
                    fontWeight: "bold",
                    fontFamily: "CarosSoft",
                  }}
                >
                  {tag}
                </Text>
              </View>
            ))
        ) : (
          <Text
            style={{
              color: themeColors.darkGray || "#AAA",
              fontSize: 12,
              fontFamily: "CarosSoft",
            }}
          >
            No tags
          </Text>
        )}
      </View>

      {/* Ratings */}
      {!spot.privateNook && (
        <>
          {/* --- Ratings row: 3 columns for Odegaard, 2 columns otherwise --- */}
          {(spot.buildingName || spot.name || "")
            .toLowerCase()
            .includes("odegaard") ? (
            // Odegaard: 3 columns
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 2,
                marginTop: 2,
              }}
            >
              {/* Noise Level */}
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 15,
                    color: themeColors.darkGray,
                    fontFamily: "CarosSoft",
                  }}
                >
                  Noise Level
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: themeColors.purple,
                    fontFamily: "CarosSoft",
                  }}
                >
                  {getNoiseLabel(spot.ratings?.noise)}
                </Text>
              </View>
              {/* Crowd Level */}
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 15,
                    color: themeColors.darkGray,
                    fontFamily: "CarosSoft",
                  }}
                >
                  Crowd Level
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: themeColors.purple,
                    fontFamily: "CarosSoft",
                  }}
                >
                  {getCrowdLabel(spot.ratings?.crowd)}
                </Text>
              </View>
              {/* Tables Open */}
              <View style={{ flex: 1, alignItems: "center" }}>
                {spot.ratings &&
                typeof spot.ratings.tableAvailability !== "undefined" ? (
                  <>
                    <Text
                      style={{
                        fontSize: 15,
                        color: themeColors.darkGray,
                        fontFamily: "CarosSoft",
                      }}
                    >
                      Tables Open
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "bold",
                        color: themeColors.purple,
                        fontFamily: "CarosSoft",
                      }}
                    >
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
                  </>
                ) : (
                  <>
                    <Text
                      style={{
                        fontSize: 15,
                        color: themeColors.darkGray,
                        fontFamily: "CarosSoft",
                      }}
                    >
                      {/* Empty label for alignment */}
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        color: "transparent",
                        fontFamily: "CarosSoft",
                      }}
                    >
                      -
                    </Text>
                  </>
                )}
              </View>
            </View>
          ) : (
            // Not Odegaard: 2 columns
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 2,
                marginTop: 2,
              }}
            >
              {/* Noise Level */}
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 15,
                    color: themeColors.darkGray,
                    fontFamily: "CarosSoft",
                  }}
                >
                  Noise Level
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: themeColors.purple,
                    fontFamily: "CarosSoft",
                  }}
                >
                  {getNoiseLabel(spot.ratings?.noise)}
                </Text>
              </View>
              {/* Crowd Level */}
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 15,
                    color: themeColors.darkGray,
                    fontFamily: "CarosSoft",
                  }}
                >
                  Crowd Level
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: themeColors.purple,
                    fontFamily: "CarosSoft",
                  }}
                >
                  {getCrowdLabel(spot.ratings?.crowd)}
                </Text>
              </View>
            </View>
          )}
          {/* Last updated label */}
          <Text
            style={{
              fontSize: 12,
              color: themeColors.darkGray,
              marginTop: 6,
              textAlign: "right",
              fontFamily: "CarosSoft",
            }}
          >
            {getLastUpdatedLabel && spot.ratings
              ? getLastUpdatedLabel(spot.ratings)
              : ""}
          </Text>
        </>
      )}
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
  if (avg < 1.5) return "Light";
  return "Busy";
}
