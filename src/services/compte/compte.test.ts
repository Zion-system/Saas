/**
 * Tests du service de gestion des comptes utilisateurs.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { creerServiceCompte, deconnecter, recupererSession } from "./compte.service";
import type { DonneesCreationCompte, DonneesConnexion } from "./compte.service";

// Mock de localStorage pour l'environnement Node.js
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
});

// Mock de l'exécuteur SQLite
const mockQuery = vi.fn();
const mockTransaction = vi.fn();

const mockDatabase = {
  query: mockQuery,
  transaction: mockTransaction,
};

// Mock de crypto.subtle pour éviter les problèmes dans l'environnement de test
vi.stubGlobal("crypto", {
  subtle: {
    importKey: vi.fn().mockResolvedValue({}),
    deriveBits: vi.fn().mockResolvedValue(
      new Uint8Array(32).fill(0) // Mock d'un hash
    ),
  },
  getRandomValues: vi.fn((arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = i;
    }
    return arr;
  }),
});

describe("Service Compte", () => {
  beforeEach(() => {
    // Nettoyer localStorage avant chaque test
    localStorage.clear();
    mockQuery.mockClear();
    mockTransaction.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("Création de compte", () => {
    it("devrait créer un compte avec hachage PBKDF2", async () => {
      const service = creerServiceCompte(mockDatabase);
      const donnees: DonneesCreationCompte = {
        prenom: "Jean",
        nom: "Dupont",
        telephone: "+242 06 00 00 00 00",
        email: "jean@example.com",
        mot_de_passe: "motdepasse123456",
      };

      mockQuery.mockResolvedValue([]);

      const compte = await service.creer(donnees);

      expect(compte.prenom).toBe("Jean");
      expect(compte.nom).toBe("Dupont");
      expect(compte.email).toBe("jean@example.com");
      expect(compte.hash_mot_de_passe).toBeDefined();
      expect(compte.sel).toBeDefined();
      expect(compte.hash_mot_de_passe).not.toBe(donnees.mot_de_passe); // Le mot de passe ne doit pas être en clair
      expect(mockQuery).toHaveBeenCalled();
    });

    it("devrait vérifier si un compte existe déjà", async () => {
      const service = creerServiceCompte(mockDatabase);
      const donnees: DonneesCreationCompte = {
        prenom: "Jean",
        nom: "Dupont",
        telephone: "+242 06 00 00 00 00",
        email: "jean@example.com",
        mot_de_passe: "motdepasse123456",
      };

      // Simuler qu'un compte existe déjà
      mockQuery.mockResolvedValue([{ id_compte: "1", email: "jean@example.com" }]);

      const existe = await service.existe(donnees.email);
      expect(existe).toBe(true);
    });

    it("devrait indiquer qu'un compte n'existe pas", async () => {
      const service = creerServiceCompte(mockDatabase);
      mockQuery.mockResolvedValue([]);

      const existe = await service.existe("inconnu@example.com");
      expect(existe).toBe(false);
    });
  });

  describe("Connexion", () => {
    it("devrait connecter avec des identifiants valides", async () => {
      const service = creerServiceCompte(mockDatabase);
      const donnees: DonneesConnexion = {
        email: "jean@example.com",
        mot_de_passe: "motdepasse123456",
      };

      // Simuler un compte existant avec un hash
      mockQuery.mockResolvedValue([
        {
          id_compte: "123",
          email: "jean@example.com",
          hash_mot_de_passe: "hash_simule",
          sel: "sel_simule",
        },
      ]);

      const session = await service.connecter(donnees);

      expect(session.email).toBe("jean@example.com");
      expect(session.compte_id).toBe("123");
      expect(localStorage.getItem("gestion_scolaire_session")).toBeTruthy();
    });

    it("devrait échouer avec un email invalide", async () => {
      const service = creerServiceCompte(mockDatabase);
      const donnees: DonneesConnexion = {
        email: "inconnu@example.com",
        mot_de_passe: "motdepasse123456",
      };

      mockQuery.mockResolvedValue([]);

      await expect(service.connecter(donnees)).rejects.toThrow("Identifiants invalides");
    });

    it("devrait échouer avec un mot de passe invalide", async () => {
      const service = creerServiceCompte(mockDatabase);
      const donnees: DonneesConnexion = {
        email: "jean@example.com",
        mot_de_passe: "mauvais_mot_de_passe",
      };

      mockQuery.mockResolvedValue([
        {
          id_compte: "123",
          email: "jean@example.com",
          hash_mot_de_passe: "hash_incorrect",
          sel: "sel_simule",
        },
      ]);

      await expect(service.connecter(donnees)).rejects.toThrow("Identifiants invalides");
    });
  });

  describe("Gestion de session", () => {
    it("devrait persister la session après connexion", async () => {
      const service = creerServiceCompte(mockDatabase);
      const donnees: DonneesConnexion = {
        email: "jean@example.com",
        mot_de_passe: "motdepasse123456",
      };

      mockQuery.mockResolvedValue([
        {
          id_compte: "123",
          email: "jean@example.com",
          hash_mot_de_passe: "hash_simule",
          sel: "sel_simule",
        },
      ]);

      await service.connecter(donnees);
      const session = recupererSession();

      expect(session).toBeTruthy();
      expect(session?.email).toBe("jean@example.com");
    });

    it("devrait supprimer la session après déconnexion", async () => {
      localStorage.setItem(
        "gestion_scolaire_session",
        JSON.stringify({ email: "jean@example.com", compte_id: "123" })
      );

      deconnecter();
      const session = recupererSession();

      expect(session).toBeNull();
    });

    it("devrait retourner null si aucune session n'existe", () => {
      const session = recupererSession();
      expect(session).toBeNull();
    });
  });
});
