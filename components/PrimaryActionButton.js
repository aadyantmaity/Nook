import React from "react";
import { TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { FONTS } from "../constants/fonts";

export default function PrimaryActionButton({
  label,
  onPress,
  disabled,
  loading,
  themeColors,
  style,
  ...props
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        {
          backgroundColor: disabled ? themeColors.gray : themeColors.purple,
          borderRadius: 8,
          paddingVertical: 10,
          paddingHorizontal: 18,
          alignItems: "center",
          flex: 1,
          opacity: disabled || loading ? 0.7 : 1,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 4,
        },
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={themeColors.white} />
      ) : (
        <Text
          style={{
            color: disabled ? themeColors.darkGray : themeColors.white,
            fontWeight: "bold",
            fontFamily: FONTS.PRIMARY,
            fontSize: 16,
          }}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}
