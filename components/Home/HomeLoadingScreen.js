import React, { useRef, useEffect } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { MapPin } from "phosphor-react-native";

function HomeLoadingScreen({ themeColors, loadingMessage }) {
  const pinPulse = useRef(new Animated.Value(1)).current;
  const markerPulses = Array.from(
    { length: 5 },
    () => useRef(new Animated.Value(0.7)).current
  );

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pinPulse, {
          toValue: 1.25,
          duration: 900,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(pinPulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    ).start();

    markerPulses.forEach((pulse, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(pulse, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(pulse, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      ).start();
    });
  }, []);

  const markerPositions = [
    { top: "18%", left: "18%" },
    { top: "22%", left: "72%" },
    { top: "0%", left: "50%" },
    { top: "40%", left: "15%" },
    { top: "42%", left: "70%" },
  ];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: themeColors.white,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={{
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale: pinPulse }],
          shadowColor: themeColors.orange,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 18,
          elevation: 10,
        }}
      >
        <MapPin size={64} color={themeColors.orange} weight="fill" />
      </Animated.View>
      <Text
        style={{
          fontSize: 48,
          fontWeight: "bold",
          color: themeColors.purple,
          marginTop: 0,
          letterSpacing: 0.5,
          fontFamily: "CarosSoft",
        }}
      >
        Nook
      </Text>
    </View>
  );
}

export default HomeLoadingScreen;
