import React, { useRef, useEffect } from "react";
import { View, Text, Animated } from "react-native";

export default function CircleLoader({
  themeColors,
  size = 40,
  color = null,
  text = null,
  textStyle = {},
  containerStyle = {},
}) {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    );
    spinAnimation.start();
    return () => spinAnimation.stop();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const loaderColor = color || themeColors.purple;

  return (
    <View style={[{ alignItems: "center" }, containerStyle]}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 3,
          borderColor: loaderColor,
          borderTopColor: "transparent",
          transform: [{ rotate: spin }],
        }}
      />
      {text && (
        <Text
          style={[
            {
              color: themeColors.darkGray,
              fontFamily: "CarosSoft",
              marginTop: 16,
              fontSize: 14,
            },
            textStyle,
          ]}
        >
          {text}
        </Text>
      )}
    </View>
  );
}
