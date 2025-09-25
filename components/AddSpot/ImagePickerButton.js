import React, { useEffect, useRef, useState } from "react";
import {
  TouchableOpacity,
  Text,
  View,
  Image,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
} from "react-native";
import { Camera, ImageSquare } from "phosphor-react-native";
import { FONTS } from "../../constants/fonts";

export default function ImagePickerButton({
  onPickImage,
  onTakePhoto,
  customImage,
  themeColors,
}) {
  const [showOptions, setShowOptions] = useState(false);
  const windowHeight = Dimensions.get("window").height;
  const sheetTranslateY = useRef(new Animated.Value(windowHeight)).current;

  const openOptions = () => {
    setShowOptions(true);
  };

  const closeOptions = (onClosed) => {
    Animated.timing(sheetTranslateY, {
      toValue: windowHeight,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setShowOptions(false);
      if (onClosed) onClosed();
    });
  };

  useEffect(() => {
    if (showOptions) {
      sheetTranslateY.setValue(windowHeight);
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start();
    }
  }, [showOptions, sheetTranslateY, windowHeight]);

  return (
    <View style={{ marginBottom: 16, alignItems: "center", width: "100%" }}>
      <TouchableOpacity
        onPress={openOptions}
        style={{
          backgroundColor: customImage?.uri
            ? themeColors.white
            : themeColors.purple,

          borderRadius: 10,
          paddingVertical: 10,
          paddingHorizontal: 16,
          alignItems: "center",
          minWidth: 160,
          shadowColor: "#000",

          shadowOffset: {
            width: 0,
            height: 2
          },

          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 4
        }}
        accessibilityLabel={
          customImage?.uri ? "Change or replace photo" : "Add a photo"
        }
        accessible={true}
      >
        <Text
          style={{
            color: customImage?.uri ? themeColors.purple : themeColors.white,
            fontWeight: "bold",
            fontFamily: FONTS.PRIMARY,
          }}
        >
          {customImage?.uri ? "Change Photo" : "Add Photo"}
        </Text>
      </TouchableOpacity>
      {/* Preview */}
      {customImage && customImage.uri && (
        <View
          style={{
            width: 330,
            height: 140,
            borderRadius: 8,
            overflow: "hidden",
            borderWidth: 0.5,
            borderColor: themeColors.black,
            marginTop: 12,
          }}
        >
          <Image
            source={{ uri: customImage.uri }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>
      )}
      {/* Bottom sheet options */}
      <Modal visible={showOptions} transparent animationType="none">
        <TouchableWithoutFeedback onPress={() => closeOptions()}>
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
            }}
          >
            <TouchableWithoutFeedback>
              <Animated.View
                style={{
                  backgroundColor: themeColors.white,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  borderTopWidth: 1,
                  borderLeftWidth: 1,
                  borderRightWidth: 1,
                  borderColor: themeColors.gray + "70",
                  minHeight: 260,
                  paddingBottom: 20,
                  transform: [{ translateY: sheetTranslateY }],
                }}
              >
                <View
                  style={{
                    alignItems: "center",
                    paddingVertical: 6,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: themeColors.gray,
                    }}
                  />
                </View>

                <Text
                  style={{
                    fontFamily: FONTS.PRIMARY,
                    fontSize: 16,
                    color: themeColors.black,
                    textAlign: "center",
                    marginBottom: 6,
                  }}
                >
                  Add Photo
                </Text>

                {onTakePhoto && (
                  <TouchableOpacity
                    onPress={() => closeOptions(() => onTakePhoto?.())}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      borderRadius: 12,
                      marginTop: 6,
                      shadowColor: "#000",

                      shadowOffset: {
                        width: 0,
                        height: 2
                      },

                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: 4
                    }}
                    accessibilityLabel="Take a photo"
                    accessible={true}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(0,0,0,0.06)",
                      }}
                    >
                      <Camera size={20} color={themeColors.purple} />
                    </View>
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text
                        style={{
                          color: themeColors.black,
                          fontFamily: FONTS.PRIMARY,
                          fontSize: 15,
                          fontWeight: "600",
                        }}
                      >
                        Take Photo
                      </Text>
                      <Text
                        style={{
                          marginTop: 1,
                          color: themeColors.darkGray,
                          fontFamily: FONTS.PRIMARY,
                          fontSize: 12,
                        }}
                      >
                        Use your camera
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => closeOptions(() => onPickImage?.())}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    borderRadius: 12,
                    marginTop: 8,
                    shadowColor: "#000",

                    shadowOffset: {
                      width: 0,
                      height: 2
                    },

                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4
                  }}
                  accessibilityLabel="Choose from library"
                  accessible={true}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(0,0,0,0.06)",
                    }}
                  >
                    <ImageSquare size={20} color={themeColors.purple} />
                  </View>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text
                      style={{
                        color: themeColors.black,
                        fontFamily: FONTS.PRIMARY,
                        fontSize: 15,
                        fontWeight: "600",
                      }}
                    >
                      Choose from Library
                    </Text>
                    <Text
                      style={{
                        marginTop: 1,
                        color: themeColors.darkGray,
                        fontFamily: FONTS.PRIMARY,
                        fontSize: 12,
                      }}
                    >
                      Pick an existing photo
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={{ height: 10 }} />

                <TouchableOpacity
                  onPress={() => closeOptions()}
                  style={{
                    marginTop: 8,
                    paddingVertical: 14,
                    alignItems: "center",
                    borderRadius: 10,
                    shadowColor: "#000",

                    shadowOffset: {
                      width: 0,
                      height: 2
                    },

                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4
                  }}
                  accessibilityLabel="Cancel"
                  accessible={true}
                >
                  <Text
                    style={{
                      color: themeColors.darkGray,
                      fontFamily: FONTS.PRIMARY,
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
