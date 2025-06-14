import React from "react";
import { TouchableOpacity, Image, View } from "react-native";
import { User } from "phosphor-react-native";

export default function ProfilePicture({
  cachedProfilePicUri,
  profilePic,
  onPick,
  themeColors,
}) {
  return (
    <TouchableOpacity onPress={onPick} style={{ alignItems: "center" }}>
      {cachedProfilePicUri ? (
        <Image
          source={{ uri: cachedProfilePicUri }}
          style={{ width: 125, height: 125, borderRadius: 75 }}
        />
      ) : profilePic ? (
        <Image
          source={{ uri: profilePic }}
          style={{ width: 125, height: 125, borderRadius: 75 }}
        />
      ) : (
        <View>
          <User size={100} color={themeColors.white} weight="bold" />
        </View>
      )}
    </TouchableOpacity>
  );
}
