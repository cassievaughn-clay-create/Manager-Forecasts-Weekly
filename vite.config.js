import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" makes built asset paths relative, so dist/index.html opens
// directly from the filesystem and works under any deploy subpath.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
