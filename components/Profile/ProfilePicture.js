import React from "react";
import { TouchableOpacity, Image, View } from "react-native";
import { User } from "phosphor-react-native";

export default function ProfilePicture({ profilePic, onPick, themeColors }) {
  return (
    <TouchableOpacity onPress={onPick} style={{ alignItems: "center" }}>
      {profilePic ? (
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
