import React from "react";
import {
  Modal,
  Pressable,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";

export default function FollowersModal({
  visible,
  onClose,
  userList,
  listLoading,
  navigation,
  themeColors,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: themeColors.white,
            borderRadius: 12,
            padding: 18,
            width: "85%",
            maxHeight: "70%",
            borderWidth: 1,
            borderColor: themeColors.black,
            shadowColor: themeColors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <Text
            style={{
              fontWeight: "bold",
              fontSize: 18,
              color: themeColors.purple,
              marginBottom: 8,
              fontFamily: "CarosSoft",
            }}
          >
            Followers
          </Text>
          {listLoading ? (
            <ActivityIndicator color={themeColors.purple} />
          ) : (
            <FlatList
              data={userList}
              keyExtractor={(item) => item.uid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    navigation.push("Profile", { uid: item.uid });
                  }}
                  style={{ paddingVertical: 10 }}
                >
                  <Text
                    style={{
                      color: themeColors.black,
                      fontSize: 16,
                      fontFamily: "CarosSoft",
                    }}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
          <TouchableOpacity
            onPress={onClose}
            style={{
              marginTop: 12,
              backgroundColor: themeColors.purple,
              borderRadius: 8,
              paddingVertical: 10,
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
      </View>
    </Modal>
  );
}
