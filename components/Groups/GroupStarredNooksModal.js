import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
} from "react-native";
import { Star, MapPin } from "phosphor-react-native";
import { FONTS } from "../../constants/fonts";

export default function GroupStarredNooksModal({
  visible,
  onClose,
  starredNooksData,
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
              marginBottom: 12,
              fontFamily: FONTS.PRIMARY,
            }}
          >
            Starred Nooks
          </Text>
          {starredNooksData.length === 0 ? (
            <Text
              style={{
                color: themeColors.darkGray,
                fontFamily: FONTS.PRIMARY,
                marginBottom: 12,
              }}
            >
              No starred nooks yet.
            </Text>
          ) : (
            <FlatList
              data={starredNooksData}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    navigation.navigate("SpotDetail", { spotId: item.id });
                  }}
                  style={{
                    backgroundColor: themeColors.lightGray,
                    borderRadius: 14,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 10,
                    minWidth: 180,
                  }}
                >
                  {item.spotPhoto ? (
                    <Image
                      source={{ uri: item.spotPhoto }}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        marginRight: 12,
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        backgroundColor: themeColors.purple,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      <MapPin size={32} color={themeColors.white} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: themeColors.purple,
                        fontWeight: "bold",
                        fontSize: 16,
                        fontFamily: FONTS.PRIMARY,
                        flexShrink: 1,
                      }}
                      numberOfLines={2}
                    >
                      {item.spotName ||
                        item.buildingName ||
                        item.name ||
                        "Nook"}
                    </Text>
                  </View>
                  <Star
                    size={22}
                    color={themeColors.purple}
                    weight="fill"
                    style={{ marginLeft: 12 }}
                  />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
