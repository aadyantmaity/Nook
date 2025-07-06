import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
} from "react-native";
import ProfilePicture from "../Profile/ProfilePicture";
import { MapPin, Star } from "phosphor-react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";

export default function GroupMessagesList({
  messages,
  group,
  themeColors,
  auth,
  navigation,
  starredNooks,
  toggleStarNook,
  userCache,
  userPicCache,
  getUserName,
  getUserProfilePic,
  handleDeleteMessage,
  setReplyToMessage,
  replyToMessage,
  flatListRef,
}) {
  // --- Add renderReplyPreview helper ---
  function renderReplyPreview(message) {
    if (!message.replyTo) return null;
    return (
      <View
        style={{
          backgroundColor: themeColors.lightGray,
          borderLeftWidth: 3,
          borderLeftColor: themeColors.purple,
          paddingVertical: 4,
          paddingHorizontal: 10,
          marginBottom: 4,
          borderRadius: 8,
        }}
      >
        <Text
          style={{
            color: themeColors.purple,
            fontWeight: "bold",
            fontSize: 12,
            fontFamily: "CarosSoft",
          }}
          numberOfLines={1}
        >
          Replying to {message.replyTo.senderName || "User"}
        </Text>
        <Text
          style={{
            color: themeColors.darkGray,
            fontSize: 11,
            fontFamily: "CarosSoft",
          }}
          numberOfLines={1}
        >
          {message.replyTo.text}
        </Text>
      </View>
    );
  }

  // --- Swipe-to-reply gesture handler ---
  function SwipeableMessage({ item, children }) {
    const translateX = React.useRef(new Animated.Value(0)).current;
    const SWIPE_THRESHOLD = 60;
    const MAX_SWIPE = 50; // Limit how far you can pull

    const onGestureEvent = Animated.event(
      [{ nativeEvent: { translationX: translateX } }],
      {
        useNativeDriver: false,
        listener: (event) => {
          // Clamp the value so it doesn't go beyond MAX_SWIPE
          const value = event.nativeEvent.translationX;
          if (value > MAX_SWIPE) {
            translateX.setValue(MAX_SWIPE);
          } else if (value < 0) {
            translateX.setValue(0);
          }
        },
      }
    );

    const onHandlerStateChange = (event) => {
      if (
        event.nativeEvent.oldState === State.ACTIVE ||
        event.nativeEvent.state === State.END
      ) {
        if (event.nativeEvent.translationX > SWIPE_THRESHOLD) {
          setReplyToMessage(item);
        }
        Animated.timing(translateX, {
          toValue: 0,
          duration: 120,
          useNativeDriver: false,
        }).start();
      }
    };

    return (
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={15}
        failOffsetY={[-10, 10]}
      >
        <Animated.View
          style={{
            transform: [
              {
                translateX: translateX.interpolate({
                  inputRange: [0, MAX_SWIPE],
                  outputRange: [0, MAX_SWIPE],
                  extrapolate: "clamp",
                }),
              },
            ],
          }}
        >
          {children}
        </Animated.View>
      </PanGestureHandler>
    );
  }

  return (
    <FlatList
      ref={flatListRef}
      data={[...messages].reverse()} // reverse for inverted list
      inverted
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      keyExtractor={(item) => item.id}
      contentContainerStyle={{
        padding: 18,
        paddingBottom: 24,
        flexGrow: 1,
        backgroundColor: themeColors.white,
      }}
      renderItem={({ item, index }) => {
        const isMe = item.uid === auth.currentUser?.uid;

        // Calculate the real index in the original (non-inverted) array
        const realIndex = messages.length - 1 - index;
        const prevItem = messages[realIndex + 1]; // Look at the previous message in the original array

        // --- Show profile picture logic ---
        let showProfilePic = false;
        if (!isMe) {
          // Show profile pic if:
          // - This is the last message in the original array (realIndex === messages.length - 1)
          // - OR the previous message is from a different user or is a system/nook_share message
          if (
            realIndex === messages.length - 1 ||
            !prevItem ||
            prevItem?.uid !== item.uid ||
            prevItem?.type === "system" ||
            prevItem?.type === "nook_share"
          ) {
            showProfilePic = true;
          }
        }

        // --- Show sender info logic (name & date) only for last in chain ---
        let showSenderInfo = false;
        if (
          realIndex === messages.length - 1 ||
          !prevItem ||
          prevItem?.uid !== item.uid ||
          prevItem?.type === "system" ||
          prevItem?.type === "nook_share"
        ) {
          showSenderInfo = true;
        }

        // --- System message (centered, darkGray, no timestamp, no user) ---
        if (item.type === "system") {
          return (
            <>
              {/* Date separator removed */}
              <View style={{ alignItems: "center", marginVertical: 8 }}>
                <Text
                  style={{
                    color: themeColors.darkGray,
                    fontSize: 14,
                    fontFamily: "CarosSoft",
                    textAlign: "center",
                    fontStyle: "italic",
                  }}
                >
                  {item.text}
                </Text>
              </View>
            </>
          );
        }
        // --- Nook Share Card ---
        if (item.type === "nook_share") {
          return (
            <>
              {/* Date separator removed */}
              <View
                style={{
                  flexDirection: "row",
                  alignSelf: "center",
                  alignItems: "center",
                  marginBottom: 30,
                  marginTop: 30,
                  maxWidth: "100%",
                }}
              >
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("SpotDetail", {
                      spotId: item.spotId,
                    })
                  }
                  style={{
                    maxWidth: 280,
                    backgroundColor: themeColors.lightGray,
                    borderRadius: 14,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                    borderColor: themeColors.black,
                    borderWidth: 0.5,
                    elevation: 5,
                  }}
                >
                  {item.spotPhoto ? (
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
                        source={{ uri: item.spotPhoto }}
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
                      {item.spotName || "Nook"}
                    </Text>
                    <Text
                      style={{
                        color: themeColors.darkGray,
                        fontSize: 13,
                        fontFamily: "CarosSoft",
                        marginTop: 2,
                      }}
                      numberOfLines={1}
                    >
                      {/* Shared by firstName lastInitial */}
                      {"Shared by "}
                      {item.senderFirstName
                        ? item.senderFirstName +
                          (item.senderLastName
                            ? " " + item.senderLastName.charAt(0)
                            : "")
                        : item.senderName || "Someone"}
                    </Text>
                  </View>
                  {/* --- Star button inside the card, at the end --- */}
                  <TouchableOpacity
                    onPress={() => toggleStarNook(item.spotId)}
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
                        starredNooks.includes(item.spotId) ? "fill" : "regular"
                      }
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            </>
          );
        }
        // Regular message bubble
        return (
          <>
            {/* Date separator removed */}
            {isMe ? (
              // My own message: right aligned, no profile picture
              <View
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "flex-end",
                  alignSelf: "flex-end",
                  marginBottom: 5,
                  maxWidth: "80%",
                }}
              >
                <View style={{ flexShrink: 1 }}>
                  {/* --- Show reply preview above bubble if this message is a reply --- */}
                  {renderReplyPreview(item)}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={!isMe}
                    onLongPress={() => {
                      if (!isMe) return;
                      Alert.alert(
                        "Delete Message",
                        "Do you want to delete this message?",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => handleDeleteMessage(item.id),
                          },
                        ]
                      );
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: themeColors.purple,
                        borderRadius: 14,
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.06,
                        shadowRadius: 2,
                        elevation: 1,
                        minWidth: 50,
                        alignItems: "center",
                        alignSelf: "flex-end",
                      }}
                    >
                      <Text
                        style={{
                          color: themeColors.white,
                          fontSize: 15,
                          fontFamily: "CarosSoft",
                        }}
                      >
                        {item.text}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {/* --- Sender info row (no profile picture) --- */}
                  {showSenderInfo && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 2,
                        alignSelf: "flex-end",
                      }}
                    >
                      <Text
                        style={{
                          color: themeColors.darkGray,
                          fontSize: 11,
                          marginLeft: 0,
                          fontFamily: "CarosSoft",
                          textAlign: "right",
                        }}
                      >
                        {getUserName(item.uid)}
                        {" · "}
                        {item.createdAt && item.createdAt.seconds
                          ? new Date(
                              item.createdAt.seconds * 1000
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              // Other's message: profile picture left, bubble right, properly aligned
              <SwipeableMessage item={item}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    marginBottom: 5,
                    maxWidth: "80%",
                  }}
                >
                  {/* Only show profile picture for the first message in a sequence */}
                  {showProfilePic ? (
                    <View style={{ marginTop: 5, marginRight: 10 }}>
                      <ProfilePicture
                        profilePic={getUserProfilePic(item.uid)}
                        themeColors={themeColors}
                        size={28}
                      />
                    </View>
                  ) : (
                    <View style={{ width: 28, marginRight: 10 }} />
                  )}
                  {/* --- Show reply preview above bubble if this message is a reply --- */}
                  <View style={{ flex: 1 }}>
                    {renderReplyPreview(item)}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        flexShrink: 1,
                      }}
                    >
                      <View style={{ flexShrink: 1, flexGrow: 1 }}>
                        <View
                          style={{
                            backgroundColor: themeColors.gray,
                            borderRadius: 14,
                            paddingVertical: 10,
                            paddingHorizontal: 16,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.06,
                            shadowRadius: 2,
                            elevation: 1,
                            minWidth: 50,
                            alignItems: "flex-start",
                            alignSelf: "flex-start",
                            maxWidth: "100%",
                          }}
                        >
                          <Text
                            style={{
                              color: themeColors.black,
                              fontSize: 15,
                              fontFamily: "CarosSoft",
                              flexShrink: 1,
                              flexWrap: "wrap",
                            }}
                          >
                            {item.text}
                          </Text>
                        </View>
                      </View>
                      {/* --- REMOVE reply arrow button --- */}
                    </View>
                    {/* Sender info row */}
                    {showSenderInfo && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginTop: 2,
                        }}
                      >
                        <Text
                          style={{
                            color: themeColors.darkGray,
                            fontSize: 11,
                            fontFamily: "CarosSoft",
                          }}
                        >
                          {getUserName(item.uid)}
                          {" · "}
                          {item.createdAt && item.createdAt.seconds
                            ? new Date(
                                item.createdAt.seconds * 1000
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </SwipeableMessage>
            )}
          </>
        );
      }}
    />
  );
}
