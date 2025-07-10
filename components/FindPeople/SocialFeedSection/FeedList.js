import React from "react";
import { View, FlatList, Text, TouchableOpacity } from "react-native";
import { Trash, ArrowBendUpLeft } from "phosphor-react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function FeedList({
  feed,
  isScrolled,
  setIsScrolled,
  navigation,
  user,
  themeColors,
  setReplyToPost,
  confirmDeletePost,
  mutualFriends,
  renderMessageWithMentions,
}) {
  return (
    <View style={{ width: "100%", flex: 1 }}>
      <View style={{ flex: 1, position: "relative" }}>
        {feed.length > 0 && isScrolled && (
          <LinearGradient
            colors={[themeColors.white + "FF", themeColors.white + "00"]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 24,
              zIndex: 2,
              pointerEvents: "none",
            }}
            pointerEvents="none"
          />
        )}
        <FlatList
          data={feed}
          keyExtractor={(item) => item.id}
          style={{ width: "100%", flex: 1 }}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: themeColors.lightGray,
                borderRadius: 10,
                padding: 14,
                marginBottom: 10,
                borderWidth: 0.5,
                borderColor: themeColors.darkGray,
                flexDirection: "row",
                alignItems: "flex-start",
                position: "relative",
              }}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <TouchableOpacity
                    onPress={() => {
                      if (item.uid) {
                        navigation.navigate("Profile", { uid: item.uid });
                      }
                    }}
                    activeOpacity={0.7}
                    style={{ flex: 1 }}
                  >
                    <Text
                      style={{
                        color: themeColors.purple,
                        fontWeight: "bold",
                        fontSize: 15,
                        fontFamily: "CarosSoft",
                      }}
                    >
                      {item.userName || "Unknown"}
                    </Text>
                  </TouchableOpacity>
                  {user && item.uid === user.uid ? (
                    <TouchableOpacity
                      onPress={() => confirmDeletePost(item.id)}
                      style={{
                        marginLeft: 10,
                        borderRadius: 6,
                        padding: 6,
                        alignItems: "center",
                        justifyContent: "center",
                        height: 32,
                        width: 32,
                      }}
                      accessibilityLabel="Delete post"
                    >
                      <Trash size={18} color={themeColors.red} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => setReplyToPost(item)}
                      style={{
                        marginLeft: 10,
                        borderRadius: 6,
                        padding: 6,
                        alignItems: "center",
                        justifyContent: "center",
                        height: 32,
                        width: 32,
                      }}
                      accessibilityLabel="Reply"
                    >
                      <ArrowBendUpLeft size={18} color={themeColors.purple} />
                    </TouchableOpacity>
                  )}
                </View>
                {/* --- Reply context above message --- */}
                {item.replyTo && (
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
                      Replying to {item.replyTo.senderName || "User"}
                    </Text>
                    <Text
                      style={{
                        color: themeColors.darkGray,
                        fontSize: 11,
                        fontFamily: "CarosSoft",
                      }}
                      numberOfLines={1}
                    >
                      {item.replyTo.text}
                    </Text>
                  </View>
                )}
                <Text
                  style={{
                    color: themeColors.black,
                    fontSize: 15,
                    marginTop: 2,
                    fontFamily: "CarosSoft",
                  }}
                >
                  {renderMessageWithMentions(item)}
                </Text>
                {/* ...existing code for taggedNames, date, etc... */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 6,
                  }}
                >
                  <View style={{ flex: 1 }} />
                  <Text
                    style={{
                      color: themeColors.darkGray,
                      fontSize: 12,
                      textAlign: "right",
                      fontFamily: "CarosSoft",
                    }}
                  >
                    {item.createdAt && item.createdAt.seconds
                      ? (() => {
                          const d = new Date(item.createdAt.seconds * 1000);
                          return (
                            d.toLocaleDateString() +
                            ", " +
                            d.toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })
                          );
                        })()
                      : ""}
                  </Text>
                </View>
              </View>
            </View>
          )}
          onScroll={(e) => {
            const offsetY = e.nativeEvent.contentOffset.y;
            setIsScrolled(offsetY > 2);
          }}
          scrollEventThrottle={16}
        />
      </View>
    </View>
  );
}
