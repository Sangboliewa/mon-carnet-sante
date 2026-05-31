import type { CapacitorConfig } from "@capacitor/cli";

// URL de production Vercel — l'APK pointe toujours vers ce serveur
const PROD_URL = "https://mon-carnet-sante-git-master-sangboliewas-projects.vercel.app";

const config: CapacitorConfig = {
  appId: "com.moncarnetsante.app",
  appName: "Mon Carnet Santé",
  webDir: "out",

  server: {
    url: PROD_URL,
    cleartext: false,
  },

  android: {
    buildOptions: {
      releaseType: "APK",
    },
    backgroundColor: "#ffffff",
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
