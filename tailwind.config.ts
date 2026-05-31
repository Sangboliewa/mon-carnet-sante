import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        health: {
          blue: "#1E6FBF",
          "blue-dark": "#154D8A",
          "blue-light": "#EBF4FF",
          green: "#2EA87E",
          "green-dark": "#1F7A5B",
          "green-light": "#EAFAF4",
        },
      },
    },
  },
  plugins: [],
};

export default config;
