import React from "react";
import { View, Image, Text } from "react-native";

export default function SpotImage({ photoUrl, themeColors }) {
  return (
    <View style={{ position: "relative", width: "100%" }}>
      {photoUrl ? (
        <View
          style={{
            width: "100%",
            height: 150,
            backgroundColor: "#EEE",
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          <Image
            source={{
              uri: photoUrl,
            }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>
      ) : (
        <View
          style={{
            width: "100%",
            height: 150,
            backgroundColor: themeColors.darkGray,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Text style={{ color: themeColors.black }}>No Image</Text>
        </View>
      )}
    </View>
  );
}
