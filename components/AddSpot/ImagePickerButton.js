import React from "react";
import { TouchableOpacity, Text, View, Image } from "react-native";

export default function ImagePickerButton({
  onPickImage,
  customImage,
  themeColors,
}) {
  return (
    <View style={{ marginBottom: 16, alignItems: "center" }}>
      <TouchableOpacity
        onPress={onPickImage}
        style={{
          backgroundColor: themeColors.purple,
          borderRadius: 8,
          paddingVertical: 10,
          paddingHorizontal: 18,
          alignItems: "center",
        }}
        accessibilityLabel="Pick an image for this location"
        accessible={true}
        disabled={false} // If you want to add a disabled prop, update color below
      >
        <Text
          style={{
            color: false ? themeColors.darkGray : themeColors.white,
            fontWeight: "bold",
            fontFamily: "CarosSoft",
          }}
        >
          {customImage ? "Change Image" : "Upload Image"}
        </Text>
      </TouchableOpacity>
      {customImage && (
        <View
          style={{
            width: 350,
            height: 140,
            borderRadius: 8,
            overflow: "hidden",
            borderWidth: 0.5,
            borderColor: themeColors.black,
            marginTop: 12,
          }}
        >
          <Image
            source={{ uri: customImage.uri }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>
      )}
    </View>
  );
}
