import React from "react";
import { TouchableOpacity, Text, View } from "react-native";
import { Heart } from "phosphor-react-native";
import { FONTS } from "../../constants/fonts";

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
          padding: 8,
          marginRight: 12,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: themeColors.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 4,
        }}
        accessibilityLabel="Toggle favorite"
        accessible={true}
      >
        <Heart
          size={22}
          color={isFavorite ? themeColors.purple : themeColors.darkGray}
          weight={isFavorite ? "fill" : "regular"}
        />
      </TouchableOpacity>
      <Text
        style={{
          color: themeColors.black,
          fontSize: 14.5,
          fontFamily: FONTS.PRIMARY,
        }}
      >
        Mark this spot as a favorite
      </Text>
    </View>
  );
}
