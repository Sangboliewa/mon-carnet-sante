import type { CapacitorConfig } from "@capacitor/cli";

const isProd = process.env.CAPACITOR_ENV === "production";

const config: CapacitorConfig = {
  appId: "com.moncarnetsante.app",
  appName: "Mon Carnet Santé",
  webDir: "out",

  // En développement : pointe vers le serveur Next.js local
  // En production  : les fichiers sont bundlés dans webDir (export statique)
  ...(isProd
    ? {}
    : {
        server: {
          url: "http://10.157.240.92:3000",
          cleartext: true,
        },
      }),

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
