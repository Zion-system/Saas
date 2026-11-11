import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Les modules de src/database/local/ (zone gelée) portent l'état de la
 * connexion SQLite (Worker + promesse d'initialisation). Un rechargement
 * à chaud les ré-exécuterait : une deuxième connexion s'ouvrirait alors
 * que l'ancienne tient encore le verrou du fichier → SQLITE_BUSY.
 * On force donc un rechargement complet de la page (qui éteint proprement
 * tous les Workers) dès qu'un de ces fichiers change.
 */
function pleinRechargementZoneBase(): Plugin {
  return {
    name: "plein-rechargement-zone-base-de-donnees",
    handleHotUpdate({ modules, server }) {
      const toucheLaBase = modules.some((module) =>
        module.file?.replace(/\\/g, "/").includes("/src/database/local/"),
      );

      if (toucheLaBase) {
        server.ws.send({ type: "full-reload" });
        return [];
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), pleinRechargementZoneBase()],

  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },

  optimizeDeps: {
    exclude: ["@sqlite.org/sqlite-wasm"],
  },
});
