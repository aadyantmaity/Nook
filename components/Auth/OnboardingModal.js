import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { CaretLeft } from "phosphor-react-native";
import { FONTS } from "../../constants/fonts";

const slides = [
  {
    title: "Welcome to Nook!",
    description:
      "Browse Nooks with live noise and crowd levels to find your perfect spot.",
    image:
      "https://res.cloudinary.com/dxnd4aryf/image/upload/w_900,h_1200,c_fit,f_auto/v1752130307/z86g9inn5qqmo7t6io6m.png",
  },
  {
    title: "Add Nooks",
    description: "Add new Nooks for everyone or just you and your friends.",
    image:
      "https://res.cloudinary.com/dxnd4aryf/image/upload/w_900,h_1200,c_fit,f_auto/v1752130630/w83bmvzpfg9ubnuiqup0.jpg",
  },
  {
    title: "Spot Details",
    description:
      "Click on a Nook to send live updates and check in to your favorite Nooks.",
    image:
      "https://res.cloudinary.com/dxnd4aryf/image/upload/w_900,h_1200,c_fit,f_auto/v1752134055/mloewartesijk3mv7knr.png",
  },
  {
    title: "Focus Timer",
    description:
      "Stay productive with our built-in focus timer. Set work sessions and track your study time.",
    image:
      "https://res.cloudinary.com/dxnd4aryf/image/upload/w_900,h_1200,c_fit,f_auto/v1755328319/jtdi9qnsr5burmqlcgte.png",
  },
  {
    title: "Community",
    description:
      "Join study groups, make new friends, and share updates with friends.",
    image:
      "https://res.cloudinary.com/dxnd4aryf/image/upload/w_900,h_1200,c_fit,f_auto/v1752133551/ezmqmv4sf2ie5nuj968b.png",
  },
  {
    title: "Profile",
    description: "Track your favorites, stats, and manage your account.",
    image:
      "https://res.cloudinary.com/dxnd4aryf/image/upload/w_900,h_1200,c_fit,f_auto/v1752133891/mwnpqcnshidya99ftt4m.png",
  },
];

export default function OnboardingModal({ visible, onFinish, themeColors }) {
  const [index, setIndex] = useState(0);
  const width = Dimensions.get("window").width * 0.9;

  const handleNext = () => {
    if (index < slides.length - 1) setIndex(index + 1);
    else onFinish && onFinish();
  };
  const handleSkip = () => onFinish && onFinish();
  const handleBack = () => {
    if (index > 0) setIndex(index - 1);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.85)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: themeColors.white,
            borderRadius: 18,
            padding: 24,
            width,
            alignItems: "center",
            elevation: 10,
            height: 675, // Fixed height for consistent modal size
            justifyContent: "flex-start",
          }}
        >
          {/* Back caret row at top */}
          <View
            style={{
              width: "100%",
              flexDirection: "row",
              alignItems: "flex-start",
              marginTop: -8, // move row closer to top
            }}
          >
            {index > 0 ? (
              <TouchableOpacity
                onPress={handleBack}
                style={{
                  padding: 0,
                  marginTop: 0,
                  marginLeft: -12, // move caret closer to left edge
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <CaretLeft size={28} color={themeColors.purple} weight="bold" />
              </TouchableOpacity>
            ) : (
              // Empty space to keep layout consistent
              <View style={{ width: 28, height: 28 }} />
            )}
          </View>
          <View
            style={{
              width: width * 0.8,
              height: width * 1.2,
              marginBottom: 12,
              backgroundColor: themeColors.gray + "22",
              justifyContent: "center",
              alignItems: "center",
              // Shadow for iOS
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 8,
            }}
          >
            <Image
              source={{ uri: slides[index].image }}
              style={{
                width: "95%",
                height: "95%",
                borderRadius: 24, // small, evenly rounded corners
                resizeMode: "contain",
              }}
            />
          </View>
          {/* Bottom content container */}
          <View
            style={{
              flex: 1,
              width: "100%",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: "bold",
                color: themeColors.purple,
                marginBottom: 10,
                textAlign: "center",
                fontFamily: FONTS.PRIMARY,
              }}
            >
              {slides[index].title}
            </Text>
            <Text
              style={{
                color: themeColors.black,
                fontSize: 16,
                marginBottom: 18,
                textAlign: "center",
                fontFamily: FONTS.PRIMARY,
              }}
            >
              {slides[index].description}
            </Text>
            <View style={{ flexDirection: "row", marginBottom: 12 }}>
              {slides.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor:
                      i === index ? themeColors.purple : themeColors.gray,
                    marginHorizontal: 4,
                  }}
                />
              ))}
            </View>
            <View
              style={{
                flexDirection: "row",
                width: "100%",
                justifyContent: "space-between",
              }}
            >
              <TouchableOpacity
                onPress={handleSkip}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  backgroundColor: themeColors.gray,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    color: themeColors.purple,
                    fontWeight: "bold",
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  Skip
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNext}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  backgroundColor: themeColors.purple,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    color: themeColors.white,
                    fontWeight: "bold",
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  {index === slides.length - 1 ? "Finish" : "Next"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
