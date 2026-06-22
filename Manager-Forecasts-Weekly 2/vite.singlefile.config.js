import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Builds one self-contained HTML (everything inlined) that opens via double-click.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: { outDir: "standalone", assetsInlineLimit: 100000000, chunkSizeWarningLimit: 5000 },
});
