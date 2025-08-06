import React from "react";
import { TouchableOpacity, View, Text, Image } from "react-native";
import { MapPin, LockKey } from "phosphor-react-native";

export default function FavoriteSpotCard({
  spot,
  cachedImage,
  themeColors,
  onPress,
  style,
}) {
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
            width: 95,
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
            width: 95,
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
      </View>
    </TouchableOpacity>
  );
}
