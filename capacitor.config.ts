import type { CapacitorConfig } from "@capacitor/cli";

const PROD_URL = "https://mon-carnet-sante-nine.vercel.app";

const config: CapacitorConfig = {
  appId: "com.moncarnetsante.app",
  appName: "Mon Carnet Santé",
  webDir: "out",

  server: {
    url: PROD_URL,
    cleartext: false,
    androidScheme: "https",
    allowNavigation: [
      "mon-carnet-sante-nine.vercel.app",
      "*.vercel.app",
      "*.supabase.co",
      "mzdijbymqepnnqlnwezv.supabase.co",
    ],
  },

  android: {
    buildOptions: {
      releaseType: "APK",
    },
    backgroundColor: "#ffffff",
    webContentsDebuggingEnabled: false,
  },

  plugins: {
    StatusBar: {
      style: "Light",
      backgroundColor: "#1E6FBF",
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1E6FBF",
      showSpinner: false,
      androidSplashResourceName: "splash",
    },
  },
};

export default config;
