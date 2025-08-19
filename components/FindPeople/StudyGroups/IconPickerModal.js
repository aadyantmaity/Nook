import React, { useState, useEffect } from "react";
import { Modal, TouchableOpacity, View, Text } from "react-native";
import * as PhosphorIcons from "phosphor-react-native";
import { FONTS } from "../../../constants/fonts";

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
  // Local state for icon selection
  const [localIcon, setLocalIcon] = useState(selectedIcon);

  useEffect(() => {
    if (visible) setLocalIcon(selectedIcon);
  }, [visible, selectedIcon]);

  const handleDone = () => {
    setSelectedIcon(localIcon);
    onClose();
  };

  const handleCancel = () => {
    setLocalIcon(selectedIcon);
    onClose();
  };

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
            borderWidth: 1,
            borderColor: themeColors.gray + "70",
            shadowColor: themeColors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
          onStartShouldSetResponder={() => true}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: themeColors.purple,
              fontFamily: FONTS.PRIMARY,
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
              const isSelected = localIcon === iconName;
              return (
                <TouchableOpacity
                  key={iconName}
                  onPress={() => setLocalIcon(iconName)}
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
                      : themeColors.darkGray,
                  }}
                >
                  <IconComponent
                    size={28}
                    color={
                      isSelected
                        ? themeColors.purple
                        : themeColors.darkGray + "ff"
                    }
                    weight="fill"
                  />
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ flexDirection: "row", marginTop: 8 }}>
            <TouchableOpacity
              onPress={handleCancel}
              style={{
                flex: 1,
                backgroundColor: themeColors.white,
                borderColor: themeColors.purple,
                borderWidth: 1,
                borderRadius: 8,
                alignItems: "center",
                paddingVertical: 10,
                marginRight: 8,
              }}
            >
              <Text
                style={{
                  color: themeColors.purple,
                  fontWeight: "bold",
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDone}
              style={{
                flex: 1,
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                alignItems: "center",
                paddingVertical: 10,
                marginLeft: 8,
              }}
            >
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
