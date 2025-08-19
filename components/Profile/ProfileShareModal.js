import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Share,
  Alert,
  Dimensions,
  Image,
} from "react-native";
import { X, ShareNetwork, User } from "phosphor-react-native";
import QRCode from "react-native-qrcode-svg";
import { FONTS } from "../../constants/fonts";

export default function ProfileShareModal({
  visible,
  onClose,
  user,
  themeColors,
}) {
  const screenWidth = Dimensions.get("window").width;
  const qrSize = Math.min(screenWidth * 0.6, 250);

  const profileLink = `nook://profile/${user.uid}`;
  const userName = `${user.firstName} ${user.lastName}`;

  const handleShareLink = async () => {
    try {
      const result = await Share.share({
        message: `Check out ${userName}'s profile on Nook! ${profileLink}`,
        url: profileLink,
        title: `${userName} - Nook Profile`,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to share profile.");
    }
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
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
        }}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={{
            backgroundColor: themeColors.white,
            borderRadius: 20,
            padding: 24,
            width: screenWidth * 0.85,
            alignItems: "center",
            borderWidth: 1,
            borderColor: themeColors.gray + "70",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 10,
          }}
          onStartShouldSetResponder={() => true}
        >
          {/* Close button */}
          <TouchableOpacity
            onPress={onClose}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              padding: 4,
              zIndex: 10,
            }}
          >
            <X size={24} color={themeColors.darkGray} />
          </TouchableOpacity>

          {/* Title */}
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: themeColors.purple,
              marginBottom: 16,
              textAlign: "center",
              fontFamily: FONTS.PRIMARY,
            }}
          >
            Share Profile
          </Text>

          {/* QR Code */}
          <View
            style={{
              backgroundColor: themeColors.white,
              padding: 20,
              borderRadius: 12,
              marginBottom: 24,
              borderWidth: 0.5,
              borderColor: themeColors.purple,
            }}
          >
            <QRCode
              value={profileLink}
              size={qrSize}
              color={themeColors.purple}
              backgroundColor={themeColors.white}
            />
          </View>

          {/* Share button */}
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              width: "100%",
            }}
          >
            <TouchableOpacity
              onPress={handleShareLink}
              style={{
                flex: 1,
                backgroundColor: themeColors.purple,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <ShareNetwork size={18} color={themeColors.white} />
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontSize: 16,
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                Share
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
