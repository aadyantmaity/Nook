import React from "react";
import { View, TextInput, TouchableOpacity } from "react-native";
import { PaperPlaneRight } from "phosphor-react-native";

export default function InputBar({
  postText,
  setPostText,
  posting,
  handleInputChange,
  handlePost,
  themeColors,
}) {
  return (
    <View
      style={{
        width: "100%",
        marginBottom: 12,
        marginTop: 16,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: themeColors.darkGray,
            borderRadius: 12,
            paddingHorizontal: 14,
            backgroundColor: themeColors.white,
            height: 44,
          }}
        >
          <TextInput
            placeholder="Share something with friends..."
            value={postText}
            onChangeText={handleInputChange}
            style={{
              flex: 1,
              height: 44,
              fontSize: 16,
              color: themeColors.black,
              fontFamily: "CarosSoft",
              paddingVertical: 0,
            }}
            editable={!posting}
            placeholderTextColor={themeColors.darkGray}
            maxLength={100}
            returnKeyType={"default"}
            blurOnSubmit={true}
          />
        </View>
        <TouchableOpacity
          onPress={handlePost}
          disabled={posting || !postText.trim()}
          style={{
            marginLeft: 12.75,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            backgroundColor: themeColors.white,
          }}
          accessibilityLabel="Submit"
        >
          <PaperPlaneRight
            size={25}
            color={
              posting || !postText.trim()
                ? themeColors.darkGray
                : themeColors.purple
            }
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
