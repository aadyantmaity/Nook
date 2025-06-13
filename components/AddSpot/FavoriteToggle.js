import React from "react";
import { TouchableOpacity, Text, View } from "react-native";
import { Heart } from "phosphor-react-native";

export default function FavoriteToggle({
  isFavorite,
  setIsFavorite,
  themeColors,
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        marginTop: 8,
      }}
    >
      <TouchableOpacity
        onPress={() => setIsFavorite((f) => !f)}
        style={{
          backgroundColor: themeColors.white,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: themeColors.black,
          padding: 8,
          marginRight: 12,
          alignItems: "center",
          justifyContent: "center",
        }}
        accessibilityLabel="Toggle favorite"
        accessible={true}
      >
        <Heart
          size={22}
          color={themeColors.purple}
          weight={isFavorite ? "fill" : "regular"}
        />
      </TouchableOpacity>
      <Text style={{ color: themeColors.black, fontSize: 14.5 }}>
        Mark this spot as a favorite
      </Text>
    </View>
  );
}
