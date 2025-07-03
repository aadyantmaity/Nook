import React, { useState, useRef } from "react";
import {
  Modal,
  TouchableOpacity,
  View,
  Text,
  FlatList,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MapPin, Star } from "phosphor-react-native";

export default function GroupStarredNooksModal({
  visible,
  onClose,
  starredNooksData,
  starredNooks,
  toggleStarNook,
  navigation,
  themeColors,
}) {
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(false);
  const [starredListWidth, setStarredListWidth] = useState(0);
  const [starredContentWidth, setStarredContentWidth] = useState(0);
  const starredListRef = useRef(null);

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
            maxHeight: "60%",
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
            Starred Nooks
          </Text>
          {!starredNooksData || starredNooksData.length === 0 ? (
            <Text
              style={{
                color: themeColors.darkGray,
                fontFamily: "CarosSoft",
                fontSize: 15,
                marginVertical: 24,
              }}
            >
              No starred nooks yet.
            </Text>
          ) : (
            <View
              style={{ width: "100%", position: "relative", minHeight: 80 }}
            >
              {showLeftGradient && (
                <LinearGradient
                  colors={[themeColors.white, themeColors.white + "00"]}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 10,
                    zIndex: 2,
                  }}
                  pointerEvents="none"
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                />
              )}
              {showRightGradient && (
                <LinearGradient
                  colors={[themeColors.white + "00", themeColors.white]}
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 28,
                    zIndex: 2,
                  }}
                  pointerEvents="none"
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                />
              )}
              <FlatList
                ref={starredListRef}
                data={starredNooksData}
                horizontal
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                onLayout={(e) => {
                  setStarredListWidth(e.nativeEvent.layout.width);
                }}
                onContentSizeChange={(w, h) => {
                  setStarredContentWidth(w);
                  setShowRightGradient(w > starredListWidth + 2);
                  setShowLeftGradient(false);
                }}
                onScroll={(e) => {
                  const x = e.nativeEvent.contentOffset.x;
                  const maxX = starredContentWidth - starredListWidth;
                  setShowLeftGradient(x > 2);
                  setShowRightGradient(maxX - x > 2);
                }}
                scrollEventThrottle={16}
                contentContainerStyle={{
                  paddingVertical: 8,
                  paddingHorizontal: 0,
                }}
                renderItem={({ item }) => (
                  <View
                    style={{
                      flexDirection: "row",
                      alignSelf: "center",
                      alignItems: "center",
                      marginBottom: 10,
                      maxWidth: "100%",
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        onClose();
                        navigation.navigate("SpotDetail", { spotId: item.id });
                      }}
                      style={{
                        maxWidth: 280,
                        backgroundColor: themeColors.lightGray,
                        borderRadius: 14,
                        padding: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        shadowColor: "#000",
                        borderColor: themeColors.darkGray,
                        borderWidth: 1,
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.06,
                        shadowRadius: 2,
                        elevation: 1,
                      }}
                    >
                      {item.spotPhoto || item.photoURL ? (
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 8,
                            overflow: "hidden",
                            marginRight: 12,
                          }}
                        >
                          <Image
                            source={{ uri: item.spotPhoto || item.photoURL }}
                            style={{ width: "100%", height: "100%" }}
                            resizeMode="cover"
                          />
                        </View>
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
                          <MapPin
                            size={32}
                            color={themeColors.white}
                            weight="bold"
                          />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: themeColors.purple,
                            fontWeight: "bold",
                            fontSize: 16,
                            fontFamily: "CarosSoft",
                          }}
                          numberOfLines={1}
                        >
                          {item.spotName ||
                            item.buildingName ||
                            item.name ||
                            "Nook"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => toggleStarNook(item.id)}
                        style={{
                          padding: 4,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Star
                          size={22}
                          color={themeColors.purple}
                          weight={
                            starredNooks.includes(item.id) ? "fill" : "regular"
                          }
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </View>
                )}
              />
            </View>
          )}
          <TouchableOpacity
            onPress={onClose}
            style={{
              marginTop: 16,
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
