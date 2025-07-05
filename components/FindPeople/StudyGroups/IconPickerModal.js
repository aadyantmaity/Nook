import React from "react";
import { Modal, TouchableOpacity, View, Text } from "react-native";
import * as PhosphorIcons from "phosphor-react-native";

const GROUP_ICONS = [
  "UsersThree",
  "ChatsCircle",
  "Books",
  "Student",
  "Globe",
  "Lightbulb",
  "Notebook",
  "Atom",
  "PuzzlePiece",
  "Brain",
  "Code",
  "Flask",
  "PenNib",
  "BookOpen",
  "Rocket",
  "MusicNotes",
  "Camera",
  "PaintBrush",
  "GameController",
  "Tree",
];

export default function IconPickerModal({
  visible,
  onClose,
  selectedIcon,
  setSelectedIcon,
  themeColors,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.2)",
          justifyContent: "center",
          alignItems: "center",
        }}
        activeOpacity={1}
        onPressOut={onClose}
      >
        <View
          style={{
            backgroundColor: themeColors.white,
            borderRadius: 16,
            padding: 24,
            width: "90%",
            maxWidth: 400,
            alignItems: "center",
          }}
          onStartShouldSetResponder={() => true}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: themeColors.purple,
              fontFamily: "CarosSoft",
              marginBottom: 12,
            }}
          >
            Choose a Group Icon
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            {GROUP_ICONS.map((iconName) => {
              const IconComponent =
                PhosphorIcons[iconName] || PhosphorIcons.UsersThree;
              const isSelected = selectedIcon === iconName;
              return (
                <TouchableOpacity
                  key={iconName}
                  onPress={() => {
                    setSelectedIcon(iconName);
                    onClose();
                  }}
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 27,
                    margin: 6,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isSelected
                      ? themeColors.purple + "22"
                      : themeColors.white,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected
                      ? themeColors.purple
                      : themeColors.gray,
                  }}
                >
                  <IconComponent
                    size={28}
                    color={
                      isSelected ? themeColors.purple : themeColors.darkGray
                    }
                    weight="fill"
                  />
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{
              marginTop: 8,
              backgroundColor: themeColors.purple,
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 32,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: themeColors.white,
                fontWeight: "bold",
                fontFamily: "CarosSoft",
              }}
            >
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
