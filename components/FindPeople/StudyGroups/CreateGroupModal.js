import React, { useState } from "react";
import {
  Modal,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
} from "react-native";
import * as PhosphorIcons from "phosphor-react-native";
import { Check, PencilSimple } from "phosphor-react-native";
import IconPickerModal from "./IconPickerModal";
import * as ImagePicker from "expo-image-picker";
import { FONTS } from "../../../constants/fonts";
import ProfilePicture from "../../Profile/ProfilePicture";

export default function CreateGroupModal({
  visible,
  onClose,
  groupName,
  setGroupName,
  groupDesc,
  setGroupDesc,
  mutualFriends,
  selectedMembers,
  setSelectedMembers,
  creating,
  groupProfilePic,
  setGroupProfilePic,
  uploadingPic,
  isPrivate,
  setIsPrivate,
  selectedIcon,
  setSelectedIcon,
  showIconModal,
  setShowIconModal,
  handleCreateGroup,
  themeColors,
}) {
  const [showImageOptionModal, setShowImageOptionModal] = useState(false);

  // --- Add image picker handler ---
  const onUploadImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setGroupProfilePic(result.assets[0].uri);
      }
    } catch (e) {
      // Optionally handle error
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.3)",
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
            width: "85%",
            maxHeight: "80%",
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
              marginBottom: 10,
              textAlign: "center",
              fontFamily: FONTS.PRIMARY,
            }}
          >
            Create Study Group
          </Text>

          {/* Group Profile Pic Picker */}
          <View
            style={{
              marginBottom: 14,
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
            }}
          >
            {groupProfilePic ? (
              <View style={{ alignItems: "center" }}>
                <TouchableOpacity
                  onPress={() => setShowImageOptionModal(true)}
                  style={{
                    width: 128,
                    height: 128,
                    borderRadius: 32,
                    overflow: "hidden",
                    backgroundColor: themeColors.purple + "22",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <Image
                    source={{ uri: groupProfilePic }}
                    style={{ width: 128, height: 128, borderRadius: 32 }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
                <Text
                  style={{
                    color: themeColors.darkGray,
                    fontSize: 12,
                    fontFamily: FONTS.PRIMARY,
                    textAlign: "center",
                  }}
                >
                  Tap to edit
                </Text>
              </View>
            ) : (
              <View style={{ alignItems: "center" }}>
                <TouchableOpacity
                  onPress={() => setShowImageOptionModal(true)}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: themeColors.purple + "22",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                    borderWidth: 2,
                    borderColor: themeColors.purple,
                  }}
                >
                  {(() => {
                    const IconComponent =
                      selectedIcon && PhosphorIcons[selectedIcon]
                        ? PhosphorIcons[selectedIcon]
                        : PhosphorIcons.UsersThree;
                    return (
                      <IconComponent
                        size={40}
                        color={themeColors.purple}
                        weight="fill"
                      />
                    );
                  })()}
                </TouchableOpacity>
                <Text
                  style={{
                    color: themeColors.darkGray,
                    fontSize: 12,
                    fontFamily: FONTS.PRIMARY,
                    textAlign: "center",
                  }}
                >
                  Tap to edit
                </Text>
              </View>
            )}
          </View>

          {/* Image Option Modal */}
          <Modal
            visible={showImageOptionModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowImageOptionModal(false)}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.3)",
                justifyContent: "center",
                alignItems: "center",
              }}
              activeOpacity={1}
              onPressOut={() => setShowImageOptionModal(false)}
            >
              <View
                style={{
                  backgroundColor: themeColors.white,
                  borderRadius: 16,
                  padding: 24,
                  width: "80%",
                  maxWidth: 340,
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
                    marginBottom: 20,
                    textAlign: "center",
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  Choose Group Image
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    setShowImageOptionModal(false);
                    setTimeout(() => setShowIconModal(true), 100);
                  }}
                  style={{
                    backgroundColor: themeColors.purple,
                    borderRadius: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    marginBottom: 12,
                    width: "100%",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: themeColors.white,
                      fontWeight: "bold",
                      fontFamily: FONTS.PRIMARY,
                      fontSize: 16,
                    }}
                  >
                    Choose Icon
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setShowImageOptionModal(false);
                    setTimeout(() => onUploadImage(), 100);
                  }}
                  style={{
                    backgroundColor: themeColors.purple,
                    borderRadius: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    marginBottom: 12,
                    width: "100%",
                    alignItems: "center",
                  }}
                  disabled={uploadingPic}
                >
                  <Text
                    style={{
                      color: themeColors.white,
                      fontWeight: "bold",
                      fontFamily: FONTS.PRIMARY,
                      fontSize: 16,
                    }}
                  >
                    {uploadingPic ? "Uploading..." : "Upload Image"}
                  </Text>
                </TouchableOpacity>

                {(groupProfilePic || selectedIcon) && (
                  <TouchableOpacity
                    onPress={() => {
                      setGroupProfilePic(null);
                      setSelectedIcon(null);
                      setShowImageOptionModal(false);
                    }}
                    style={{
                      backgroundColor: themeColors.white,
                      borderColor: themeColors.red,
                      borderWidth: 1,
                      borderRadius: 8,
                      paddingVertical: 12,
                      paddingHorizontal: 24,
                      width: "100%",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: themeColors.red,
                        fontWeight: "bold",
                        fontFamily: FONTS.PRIMARY,
                        fontSize: 16,
                      }}
                    >
                      Remove Image
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* --- Icon Picker Modal --- */}
          <IconPickerModal
            visible={showIconModal}
            onClose={() => setShowIconModal(false)}
            selectedIcon={selectedIcon}
            setSelectedIcon={setSelectedIcon}
            themeColors={themeColors}
          />

          <TextInput
            placeholder="Group Name"
            value={groupName}
            onChangeText={setGroupName}
            style={{
              borderWidth: 1,
              borderColor: themeColors.darkGray,
              borderRadius: 8,
              padding: 10,
              width: "100%",
              marginBottom: 10,
              color: themeColors.black,
              fontFamily: FONTS.PRIMARY,
            }}
            placeholderTextColor={themeColors.darkGray}
            maxLength={25}
          />
          <TextInput
            placeholder="Description (optional)"
            value={groupDesc}
            onChangeText={setGroupDesc}
            style={{
              borderWidth: 1,
              borderColor: themeColors.darkGray,
              borderRadius: 8,
              padding: 10,
              width: "100%",
              marginBottom: 10,
              color: themeColors.black,
              fontFamily: FONTS.PRIMARY,
              maxLength: 50,
            }}
            placeholderTextColor={themeColors.darkGray}
          />
          {/* Public/Private Toggle */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 10,
              marginTop: 2,
              alignSelf: "center",
            }}
          >
            <TouchableOpacity
              onPress={() => setIsPrivate(false)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginRight: 18,
              }}
              accessibilityLabel="Set group as public"
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  borderWidth: 2,
                  borderColor: isPrivate
                    ? themeColors.gray
                    : themeColors.purple,
                  backgroundColor: !isPrivate
                    ? themeColors.purple
                    : themeColors.white,
                  marginRight: 6,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {!isPrivate && (
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: themeColors.white,
                    }}
                  />
                )}
              </View>
              <Text
                style={{
                  color: !isPrivate ? themeColors.purple : themeColors.darkGray,
                  fontWeight: "bold",
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                Public
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsPrivate(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
              accessibilityLabel="Set group as private"
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  borderWidth: 2,
                  borderColor: isPrivate
                    ? themeColors.purple
                    : themeColors.gray,
                  backgroundColor: isPrivate
                    ? themeColors.purple
                    : themeColors.white,
                  marginRight: 6,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isPrivate && (
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: themeColors.white,
                    }}
                  />
                )}
              </View>
              <Text
                style={{
                  color: isPrivate ? themeColors.purple : themeColors.darkGray,
                  fontWeight: "bold",
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                Private
              </Text>
            </TouchableOpacity>
          </View>
          <Text
            style={{
              fontWeight: "bold",
              color: themeColors.purple,
              marginBottom: 6,
              marginTop: 10,
              fontFamily: FONTS.PRIMARY,
            }}
          >
            Add Friends
          </Text>
          <ScrollView
            style={{ width: "100%", maxHeight: 120 }}
            showsVerticalScrollIndicator={false}
          >
            {mutualFriends.length === 0 ? (
              <Text
                style={{
                  color: themeColors.darkGray,
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                No friends found.
              </Text>
            ) : (
              mutualFriends.map((u) => (
                <TouchableOpacity
                  key={u.uid}
                  onPress={() => {
                    setSelectedMembers((prev) =>
                      prev.includes(u.uid)
                        ? prev.filter((id) => id !== u.uid)
                        : [...prev, u.uid]
                    );
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 8,
                  }}
                >
                  <View style={{ marginRight: 8 }}>
                    <ProfilePicture
                      size={32}
                      profilePic={u.profilePic}
                      themeColors={themeColors}
                    />
                  </View>
                  <Text
                    style={{
                      color: themeColors.black,
                      fontFamily: FONTS.PRIMARY,
                      flex: 1,
                    }}
                  >
                    {u.firstName} {u.lastName}
                  </Text>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 1,
                      borderColor: themeColors.purple,
                      backgroundColor: selectedMembers.includes(u.uid)
                        ? themeColors.purple
                        : themeColors.white,
                      marginLeft: 12,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selectedMembers.includes(u.uid) && (
                      <Check
                        size={14}
                        color={themeColors.white}
                        weight="bold"
                      />
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
          <View style={{ flexDirection: "row", marginTop: 16, width: "100%" }}>
            <TouchableOpacity
              onPress={onClose}
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
              onPress={handleCreateGroup}
              disabled={creating}
              style={{
                flex: 1,
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                paddingVertical: 10,
                alignItems: "center",
                marginLeft: 8,
                opacity: creating ? 0.7 : 1,
              }}
            >
              <Text
                style={{
                  color: creating ? themeColors.darkGray : themeColors.white,
                  fontWeight: "bold",
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                {creating ? "Creating..." : "Create"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
