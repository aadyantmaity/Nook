import React from "react";
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
import IconPickerModal from "./IconPickerModal";
import * as ImagePicker from "expo-image-picker";

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
            borderColor: themeColors.black,
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
              fontFamily: "CarosSoft",
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
                <View
                  style={{
                    width: 128,
                    height: 128,
                    borderRadius: 32,
                    overflow: "hidden",
                    backgroundColor: themeColors.purple + "22",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 4,
                  }}
                >
                  <Image
                    source={{ uri: groupProfilePic }}
                    style={{ width: 128, height: 128, borderRadius: 32 }}
                    resizeMode="cover"
                  />
                </View>
                <TouchableOpacity
                  onPress={() => setGroupProfilePic(null)}
                  style={{
                    marginTop: 4,
                    backgroundColor: themeColors.purple,
                    borderRadius: 8,
                    paddingVertical: 6,
                    paddingHorizontal: 16,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: themeColors.white,
                      fontWeight: "bold",
                      fontFamily: "CarosSoft",
                      fontSize: 14,
                    }}
                  >
                    Remove Image
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ alignItems: "center" }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: themeColors.purple + "22",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 4,
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
                        size={36}
                        color={themeColors.purple}
                        weight="fill"
                      />
                    );
                  })()}
                </View>
                <View style={{ flexDirection: "row", marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={() => setShowIconModal(true)}
                    style={{
                      backgroundColor: themeColors.purple,
                      borderRadius: 8,
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      minWidth: 80,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 8,
                    }}
                    accessibilityLabel="Choose Group Icon"
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        color: themeColors.white,
                        fontWeight: "bold",
                        fontFamily: "CarosSoft",
                        fontSize: 14,
                        textAlign: "center",
                      }}
                    >
                      Icon
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onUploadImage}
                    style={{
                      backgroundColor: themeColors.purple,
                      borderRadius: 8,
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      minWidth: 80,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    disabled={uploadingPic}
                    accessibilityLabel="Upload Group Image"
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        color: themeColors.white,
                        fontWeight: "bold",
                        fontFamily: "CarosSoft",
                        fontSize: 14,
                        textAlign: "center",
                      }}
                    >
                      Upload
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
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
              fontFamily: "CarosSoft",
              maxLength: 50,
            }}
            placeholderTextColor={themeColors.darkGray}
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
              fontFamily: "CarosSoft",
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
                  fontFamily: "CarosSoft",
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
                  fontFamily: "CarosSoft",
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
              fontFamily: "CarosSoft",
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
                  fontFamily: "CarosSoft",
                }}
              >
                No mutual friends found.
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
                      marginRight: 12,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selectedMembers.includes(u.uid) && (
                      <Text
                        style={{
                          color: themeColors.white,
                          fontWeight: "bold",
                        }}
                      >
                        ✓
                      </Text>
                    )}
                  </View>
                  <Text
                    style={{
                      color: themeColors.black,
                      fontFamily: "CarosSoft",
                    }}
                  >
                    {u.firstName} {u.lastName} ({u.email})
                  </Text>
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
                  fontFamily: "CarosSoft",
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
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontFamily: "CarosSoft",
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
