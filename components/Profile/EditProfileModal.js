import React from "react";
import {
  Modal,
  Pressable,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
} from "react-native";
import { X, User } from "phosphor-react-native";

export default function EditProfileModal({
  visible,
  onClose,
  onSave,
  editedFirstName,
  setEditedFirstName,
  editedLastName,
  setEditedLastName,
  editedGradYear,
  setEditedGradYear,
  editedProfilePic,
  setEditedProfilePic,
  profilePic,
  themeColors,
  handlePickProfilePic,
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: "80%",
            backgroundColor: themeColors.white,
            borderRadius: 8,
            padding: 16,
            alignItems: "center",
            borderWidth: 1,
            borderColor: themeColors.black,
            shadowColor: themeColors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <TouchableOpacity
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              zIndex: 10,
              padding: 6,
            }}
            onPress={onClose}
            hitSlop={10}
          >
            <X size={22} color={themeColors.purple} weight="bold" />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: themeColors.black,
              marginBottom: 16,
              fontFamily: "CarosSoft",
            }}
          >
            Edit Profile
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <View style={{ alignItems: "center", marginRight: 12 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: themeColors.darkGray,
                  marginBottom: 4,
                  fontFamily: "CarosSoft",
                }}
              >
                Current
              </Text>
              {profilePic ? (
                <Image
                  source={{ uri: profilePic }}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    borderWidth: 0.5,
                    borderColor: themeColors.black,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: themeColors.purple,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 0.5,
                    borderColor: themeColors.gray,
                  }}
                >
                  <User size={32} color={themeColors.white} weight="bold" />
                </View>
              )}
            </View>
            <View style={{ alignItems: "center", marginRight: 12 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: themeColors.darkGray,
                  marginBottom: 4,
                  fontFamily: "CarosSoft",
                }}
              >
                New
              </Text>
              {editedProfilePic ? (
                <Image
                  source={{ uri: editedProfilePic }}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    borderWidth: 0.5,
                    borderColor: themeColors.black,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: "#f0eafd",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 0.5,
                    borderColor: themeColors.black,
                  }}
                >
                  <User size={32} color={themeColors.purple} weight="bold" />
                </View>
              )}
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                paddingVertical: 8,
                paddingHorizontal: 12,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 18,
              }}
              onPress={handlePickProfilePic}
            >
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontSize: 13,
                  fontFamily: "CarosSoft",
                }}
              >
                Change Picture
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={{
              width: "100%",
              borderWidth: 0.5,
              borderColor: themeColors.purple,
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              color: themeColors.black,
              backgroundColor: themeColors.white,
              fontFamily: "CarosSoft",
            }}
            placeholder="First Name"
            value={editedFirstName}
            onChangeText={setEditedFirstName}
            placeholderTextColor={themeColors.darkGray}
          />
          <TextInput
            style={{
              width: "100%",
              borderWidth: 0.5,
              borderColor: themeColors.purple,
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              color: themeColors.black,
              backgroundColor: themeColors.white,
              fontFamily: "CarosSoft",
            }}
            placeholder="Last Name"
            value={editedLastName}
            onChangeText={setEditedLastName}
            placeholderTextColor={themeColors.darkGray}
          />
          <TextInput
            style={{
              width: "100%",
              borderWidth: 0.5,
              borderColor: themeColors.purple,
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              color: themeColors.black,
              backgroundColor: themeColors.white,
              fontFamily: "CarosSoft",
            }}
            placeholder="Graduation Year"
            value={editedGradYear}
            onChangeText={setEditedGradYear}
            keyboardType="numeric"
            placeholderTextColor={themeColors.darkGray}
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: themeColors.white,
                borderColor: themeColors.black,
                borderWidth: 0.5,
                borderRadius: 8,
                alignItems: "center",
                padding: 12,
                marginRight: 8,
              }}
              onPress={onClose}
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
              style={{
                flex: 1,
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                alignItems: "center",
                padding: 12,
                marginLeft: 8,
              }}
              onPress={onSave}
            >
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontFamily: "CarosSoft",
                }}
              >
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
