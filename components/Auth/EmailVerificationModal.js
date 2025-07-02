import React from "react";
import { View, Text, Modal, TouchableOpacity } from "react-native";
import { Check, Repeat, X } from "phosphor-react-native";
import { colors } from "../../constants/colors";

export default function EmailVerificationModal({
  isVisible,
  onResendEmail,
  onCheckVerification,
  errorMessage,
  onBackToLogin,
}) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={() => {}}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        }}
      >
        <View
          style={{
            width: "100%",
            paddingHorizontal: 8,
            maxWidth: 420,
            alignSelf: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              paddingTop: 0,
              paddingHorizontal: 0,
              paddingBottom: 18,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 12,
              elevation: 7,
              width: "100%",
              maxWidth: 400,
              overflow: "hidden",
            }}
          >
            {/* Add extra top padding to prevent cut-off */}
            <View style={{ height: 24, width: "100%" }} />
            <View
              style={{
                backgroundColor: colors.purple,
                width: 54,
                height: 54,
                borderRadius: 27,
                alignItems: "center",
                justifyContent: "center",
                alignSelf: "center",
                marginTop: 0,
                marginBottom: 4,
                shadowColor: colors.purple,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.18,
                shadowRadius: 6,
                elevation: 4,
              }}
            >
              <Check size={32} color={colors.white} weight="bold" />
            </View>
            <View
              style={{
                paddingHorizontal: 12,
                paddingTop: 6,
                width: "100%",
              }}
            >
              <View style={{ marginBottom: 2, width: "100%" }}>
                <Text
                  style={{
                    fontFamily: "CarosSoft",
                    fontWeight: "700",
                    fontSize: 20,
                    color: colors.purple,
                    marginBottom: 2,
                    textAlign: "center",
                  }}
                >
                  Secure your account
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "CarosSoft",
                    textAlign: "center",
                    color: colors.purple,
                    marginVertical: 2,
                    lineHeight: 19,
                  }}
                >
                  Please verify your email address to continue using Nook.
                </Text>
              </View>
              <View style={{ marginBottom: 4 }}>
                {errorMessage && (
                  <Text
                    style={{
                      color: colors.red,
                      marginBottom: 2,
                      textAlign: "center",
                      fontFamily: "CarosSoft",
                      fontWeight: "600",
                      fontSize: 13,
                    }}
                  >
                    {errorMessage}
                  </Text>
                )}
              </View>
              <View
                style={{
                  height: 1,
                  backgroundColor: colors.lightGray,
                  width: "100%",
                  marginVertical: 8,
                  borderRadius: 1,
                }}
              />
              <View style={{ width: "100%" }}>
                <View
                  style={{
                    flexDirection: "row",
                    width: "100%",
                    marginBottom: 0,
                  }}
                >
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.purple,
                      height: 38,
                      borderRadius: 19,
                      justifyContent: "center",
                      alignItems: "center",
                      alignSelf: "center",
                      marginBottom: 0,
                      marginRight: 4,
                      flex: 1,
                    }}
                    onPress={onCheckVerification}
                    activeOpacity={0.85}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Check size={18} color="white" weight="bold" />
                      <Text
                        style={{
                          fontFamily: "CarosSoft",
                          fontSize: 15,
                          fontWeight: "500",
                          marginLeft: 4,
                          color: "white",
                        }}
                      >
                        I've Verified
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onResendEmail}
                    style={{
                      backgroundColor: colors.white,
                      borderColor: colors.purple,
                      borderWidth: 1.5,
                      height: 38,
                      borderRadius: 19,
                      justifyContent: "center",
                      alignItems: "center",
                      alignSelf: "center",
                      marginBottom: 0,
                      marginLeft: 4,
                      flex: 1,
                    }}
                    activeOpacity={0.85}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Repeat size={18} color={colors.purple} weight="bold" />
                      <Text
                        style={{
                          fontFamily: "CarosSoft",
                          fontSize: 15,
                          fontWeight: "500",
                          marginLeft: 4,
                          color: colors.purple,
                        }}
                      >
                        Resend email
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={onBackToLogin}
                  style={{
                    width: "100%",
                    backgroundColor: colors.red,
                    height: 38,
                    borderRadius: 19,
                    justifyContent: "center",
                    alignItems: "center",
                    alignSelf: "center",
                    marginBottom: 0,
                    marginTop: 10,
                  }}
                  activeOpacity={0.85}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <X size={18} color={colors.white} weight="bold" />
                    <Text
                      style={{
                        fontFamily: "CarosSoft",
                        fontSize: 15,
                        fontWeight: "500",
                        marginLeft: 4,
                        color: colors.white,
                      }}
                    >
                      Back to Login/Sign Up
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
