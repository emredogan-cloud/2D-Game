import { defineConfig } from "vite";

// Static HTML5 delivery: base "./" keeps the built bundle relocatable so it can
// be served from any host or subpath (e.g. itch.io, GitHub Pages, Vercel).
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    target: "es2020",
    sourcemap: true,
  },
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
  },
});
