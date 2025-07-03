import React, { useState } from "react";
import { TouchableOpacity, Image, View, ActivityIndicator } from "react-native";
import { User } from "phosphor-react-native";

export default function ProfilePicture({
  profilePic,
  onPick,
  themeColors,
  size = 125,
  isTouchable = false, // new prop
  isLoading = false, // allow parent to pass loading state if needed
}) {
  const [imageLoaded, setImageLoaded] = useState(false);

  if (isLoading) {
    return (
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
        }}
      >
        <ActivityIndicator size={size * 0.5} color={themeColors.purple} />
      </View>
    );
  }
  if (isTouchable && onPick) {
    return (
      <TouchableOpacity onPress={onPick} style={{ alignItems: "center" }}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: themeColors.purple,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {profilePic && (
            <Image
              source={{ uri: profilePic }}
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                position: "absolute",
                top: 0,
                left: 0,
                opacity: imageLoaded ? 1 : 0,
              }}
              onLoadEnd={() => setImageLoaded(true)}
            />
          )}
          {/* Always show fallback icon until image is loaded */}
          {(!profilePic || !imageLoaded) && (
            <User size={size * 0.8} color={themeColors.white} weight="bold" />
          )}
        </View>
      </TouchableOpacity>
    );
  }
  // Not touchable
  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: themeColors.purple,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {profilePic && (
          <Image
            source={{ uri: profilePic }}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              position: "absolute",
              top: 0,
              left: 0,
              opacity: imageLoaded ? 1 : 0,
            }}
            onLoadEnd={() => setImageLoaded(true)}
          />
        )}
        {/* Always show fallback icon until image is loaded */}
        {(!profilePic || !imageLoaded) && (
          <User size={size * 0.8} color={themeColors.white} weight="bold" />
        )}
      </View>
    </View>
  );
}
