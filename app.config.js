import "dotenv/config";

export default {
  expo: {
    name: "Nook",
    slug: "nook",
    version: "1.0.0",
    icon: "./assets/NewNook.png",
    scheme: "nook",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/NewNook.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      bundleIdentifier: "com.aadyant.nook",
      usesNotifications: true,
      buildNumber: "1.0.8",
      supportsTablet: true,
      associatedDomains: ["applinks:nook-web.netlify.app"],
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSPhotoLibraryUsageDescription:
          "This app needs access to your photo library so you can upload images of study spots.",
        CFBundleURLTypes: [
          {
            CFBundleURLName: "nook-deep-link",
            CFBundleURLSchemes: ["nook"],
          },
        ],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/NewNook.png",
        backgroundColor: "#ffffff",
      },
      package: "com.aadyant.nook",
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "nook",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "nook-web.netlify.app",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    plugins: [
      [
        "expo-splash-screen",
        {
          backgroundColor: "#ffffff",
          resizeMode: "contain",
          image: "./assets/NewNook.png",
        },
      ],
      "expo-font",
      [
        "expo-notifications",
        {
          icon: "./assets/NewNook.png",
          color: "#ffffff",
        },
      ],
    ],
    extra: {
      eas: {
        projectId: "4fa00c32-f3ed-4ef5-ad72-b04ec4e10589",
      },
      locationiqApiKey: process.env.LOCATIONIQ_API_KEY,
    },
  },
};


