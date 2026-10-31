import { defineConfig } from "vite";
import { cpSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Copies three's Draco / Basis decoders to public/decoders so
// DRACOLoader.setDecoderPath("decoders/draco/") and KTX2Loader
// .setTranscoderPath("decoders/basis/") resolve, included in the local build.
function decoders() {
  return {
    name: "velvet-decoders",
    buildStart() {
      const here = dirname(fileURLToPath(import.meta.url));
      const src = resolve(here, "node_modules/three/examples/jsm/libs");
      for (const d of ["draco", "basis"]) {
        const from = resolve(src, d);
        if (existsSync(from)) cpSync(from, resolve(here, "public/decoders", d), { recursive: true });
      }
    },
  };
}

// Image/audio paths are loaded at runtime, so Vite cannot discover them from
// imports. Copy the source assets as well as the generated JavaScript chunks.
function gameAssets() {
  let output = "dist";
  return {
    name: "velvet-game-assets",
    configResolved(config: { build: { outDir: string } }) { output = config.build.outDir; },
    closeBundle() { cpSync(resolve("assets"), resolve(output, "assets"), { recursive: true }); },
  };
}

// The self-hosted edition loads only local files and uses device-local saves.
function standalone(demo = false) {
  return {
    name: "velvet-standalone",
    transformIndexHtml(html: string) {
      return {
        html,
        tags: [
          { tag: "meta", attrs: { name: "description", content: demo ? "Try Velvet Cruise in your browser. Drive the five coastal stages to Ending E in this free demo." : "Velvet Cruise, a pixel-art arcade driving game with fifteen stages and five finish lines. Full version for Windows and Mac coming soon." }, injectTo: "head" as const },
          { tag: "link", attrs: { rel: "canonical", href: "https://sabnockworks.com/games/more-projects/velvet-cruise/" }, injectTo: "head" as const },
        ],
      };
    },
  };
}

export default defineConfig(({ mode, command }) => ({
  base: "./",
  plugins: [decoders(), gameAssets(), ...(["standalone", "demo"].includes(mode) ? [standalone(mode === "demo")] : []), {
    name: "velvet-edition",
    transformIndexHtml: () => [{ tag: "meta", attrs: { name: "velvet-edition", content: (mode === "demo" || mode === "demo-desktop") ? "demo-e" : "full" }, injectTo: "head" as const }],
  }],
  define: {
    __DEMO__: JSON.stringify(mode === "demo" || mode === "demo-desktop"),
    "import.meta.env.VITE_STATISTICS_PRODUCTION": JSON.stringify(command === "build" && mode === "standalone" && process.env.VELVET_PRODUCTION_STATISTICS === "1" ? "true" : "false"),
    "import.meta.env.VITE_DESKTOP_BUILD": JSON.stringify(mode === "desktop" || mode === "demo-desktop" ? "true" : "false"),
    "import.meta.env.VITE_DESKTOP_RANKINGS": JSON.stringify(command === "build" && mode === "desktop" ? "true" : "false"),
  },
  build: { target: "es2022", sourcemap: false, assetsDir: "_app" },
}));
