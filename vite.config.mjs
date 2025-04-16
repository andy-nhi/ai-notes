import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173, // Make sure this port is not in use
    strictPort: true,
  },
  build: {
    target: "esnext",
    outDir: "dist", // Output directory for React build
    rollupOptions: {
      input: "./renderer/index.html", // Ensure Vite knows where your main HTML entry is
    },
  },
});
