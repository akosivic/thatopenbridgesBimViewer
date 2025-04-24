import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  esbuild: {
    supported: {
      "top-level-await": true,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Create vendor chunk for node_modules
          if (id.includes("node_modules")) {
            // Split node_modules into smaller chunks based on package names
            const module = id.split("node_modules/").pop()?.split("/")[0];
            if (module) {
              return `vendor.${module}`;
            }
          }
          // You can add more conditions for custom chunks
          return null; // Default return value
        },
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
    assetsInlineLimit: 4096,
  },
});
