import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  let config: any = {
    plugins: [react()],
  };

  // Only apply these settings in development mode
  if (command === "serve") {
    config.server = {
      proxy: {
        "/api": {
          target: "http://localhost:8988", // Change this to your API server
          changeOrigin: true,
          secure: false,
        },
        // "/api": {
        //   target: "http://localhost:8989", // Change this to your API server
        //   changeOrigin: true,
        //   secure: false,
        // },
        "/data": {
          target: "http://localhost:8988", // Change this to your static files server
          changeOrigin: true,
          secure: false,
        },
        "/videos": {
          target: "http://localhost:8989", // Change this to your static files server
          changeOrigin: true,
          secure: false,
        },
      },
    };
  }

  return config;
});
