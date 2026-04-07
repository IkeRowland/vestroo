import 'dotenv/config';

export default {
  expo: {
    name: "Vestroo Driver",
    slug: "vestroo-chauffeur",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./src/assets/driver-logo-app.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./src/assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: ["**/*"],
    experiments: {
      tsconfigPaths: true
    },
    ios: {
      supportsTablet: true
    },
    android: {
      package: "co.za.vestroo.chauffeur",
      adaptiveIcon: {
        foregroundImage: "./src/assets/driver-logo-app.png",
        backgroundColor: "#ffffff"
      },
      permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_GOOGLE_API_KEY
        }
      }
    },
    web: {
      favicon: "./src/assets/favicon.png"
    },
    extra: {
      slug: "vestroo-chauffeur",
      eas: {
        projectId: "2d99b6ac-0d50-499e-b5d1-c88612712ce7"
      }
    }
  }
};
