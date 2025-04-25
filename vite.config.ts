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
          // Split node_modules into smaller chunks based on package names
          if (id.includes("node_modules")) {
            const segments = id.split("node_modules/");
            if (segments.length > 1) {
              const modulePath = segments[1].split("/");
              if (modulePath.length > 0) {
                // Group by package name and subdirectories for finer granularity
                return `vendor.${modulePath[0]}`;
              }
            }
          }
          // Create separate chunks for specific libraries if needed
          // if (id.includes("some-large-library")) {
          //   return "vendor.some-large-library";
          // }
          // Default return value
          return null;
        },
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 300, // Reduce chunk size warning limit to 300 KB for Azure compatibility
  },
});
