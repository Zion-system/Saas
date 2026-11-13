import { describe, expect, it } from "vitest";
import {
  CATALOGUE_MATIERES,
  CATEGORIES_MATIERES,
  ONGLETS_CYCLES,
  grouperParCategorie,
  normaliserLibelle,
  suggererCode,
} from "./catalogue-matieres";

/**
 * Le catalogue est le cœur de la création « en une minute » : s'il
 * propose deux fois le même code ou le même nom, l'ajout en lot échoue
 * sur la base (UNIQUE). Ces tests verrouillent la cohérence du catalogue
 * et les deux aides d'interface (code auto, détection de doublon).
 */

describe("suggestion de code automatique", () => {
  it("dérive un code court du nom, en majuscules sans accents", () => {
    expect(suggererCode("Français")).toBe("FRAN");
    expect(suggererCode("Mathématiques")).toBe("MATH");
    expect(suggererCode("Chinois")).toBe("CHIN");
    expect(suggererCode("Éveil au milieu")).toBe("EVEI");
    expect(suggererCode("Sciences de la Vie et de la Terre")).toBe("SCIE");
  });

  it("garde les codes courts tels quels et ignore les séparateurs", () => {
    expect(suggererCode("EPS")).toBe("EPS");
    expect(suggererCode("SVT")).toBe("SVT");
    expect(suggererCode("Éducation civique et morale")).toBe("EDUC");
    expect(suggererCode("Éducation physique et sportive")).toBe("EDUC");
    expect(suggererCode("  sciences   physiques ")).toBe("SCIE");
    expect(suggererCode("Biologie")).toBe("BIOL");
  });

  it("renvoie une chaîne vide quand le nom ne contient rien d'utilisable", () => {
    expect(suggererCode("")).toBe("");
    expect(suggererCode("---")).toBe("");
    expect(suggererCode("   ")).toBe("");
  });
});

describe("normalisation des libellés (doublons pendant la frappe)", () => {
  it("rapproche les saisies qui ne diffèrent que par espaces ou casse", () => {
    expect(normaliserLibelle("Mathématiques")).toBe("mathématiques");
    expect(normaliserLibelle("  Mathématiques  ")).toBe("mathématiques");
    expect(normaliserLibelle("Sciences  physiques")).toBe(
      "sciences physiques",
    );
  });

  it("distingue deux noms réellement différents", () => {
    expect(normaliserLibelle("Français")).not.toBe("Français avancé");
    expect(normaliserLibelle("Anglais")).not.toBe("Mathématiques");
  });
});

describe("regroupement par catégorie", () => {
  it("ordonne les groupes : catalogue, catégories libres, Autres en dernier", () => {
    const groupes = grouperParCategorie([
      { id: "1", categorie: "Éveil" },
      { id: "2", categorie: "Humanités" },
      { id: "3", categorie: null },
      { id: "4", categorie: "Langues" },
      { id: "5", categorie: "Langues" },
      { id: "6", categorie: "Sciences" },
    ]);

    expect(groupes.map((g) => g.libelle)).toEqual([
      "Langues",
      "Sciences",
      "Humanités",
      "Éveil",
      "Autres",
    ]);
    expect(groupes[0].matieres).toHaveLength(2);
    expect(groupes[3].categorie).toBe("Éveil");
    expect(groupes[4].categorie).toBe(null);
  });

  it("garde l'ordre alphabétique entre catégories libres", () => {
    const groupes = grouperParCategorie([
      { id: "1", categorie: "Technologie" },
      { id: "2", categorie: "Éveil" },
    ]);
    expect(groupes.map((g) => g.libelle)).toEqual(["Éveil", "Technologie"]);
  });

  it("renvoie une liste vide pour un référentiel vide", () => {
    expect(grouperParCategorie([])).toEqual([]);
  });
});

describe("cohérence du catalogue congolais", () => {
  it("propose des matières sur les trois onglets (primaire, collège, lycée)", () => {
    for (const onglet of ONGLETS_CYCLES) {
      expect(CATALOGUE_MATIERES[onglet.id].length).toBeGreaterThan(0);
    }
  });

  it("dans un même onglet, jamais deux fois le même nom ni le même code", () => {
    for (const onglet of ONGLETS_CYCLES) {
      const matieres = CATALOGUE_MATIERES[onglet.id];
      const libelles = matieres.map((m) => normaliserLibelle(m.libelle));
      const codes = matieres.map((m) => m.code);
      expect(new Set(libelles).size).toBe(libelles.length);
      expect(new Set(codes).size).toBe(codes.length);
    }
  });

  it("une même matière garde le même code et la même catégorie d'un cycle à l'autre, et deux matières différentes n'occupent jamais le même code", () => {
    const parLibelle = new Map<
      string,
      { code: string; categorie: string }
    >();
    for (const matiere of ONGLETS_CYCLES.flatMap(
      (o) => CATALOGUE_MATIERES[o.id],
    )) {
      const cle = normaliserLibelle(matiere.libelle);
      const connue = parLibelle.get(cle);
      if (connue) {
        expect(matiere.code).toBe(connue.code);
        expect(matiere.categorie).toBe(connue.categorie);
      } else {
        parLibelle.set(cle, { code: matiere.code, categorie: matiere.categorie });
      }
    }
    // Deux libellés différents ne partagent jamais un code : cocher les
    // deux ne doit jamais heurter l'index UNIQUE de la base.
    const codes = [...parLibelle.values()].map((v) => v.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("n'utilise que les quatre catégories affichées et des codes propres", () => {
    const toutes = ONGLETS_CYCLES.flatMap((o) => CATALOGUE_MATIERES[o.id]);
    for (const matiere of toutes) {
      expect(CATEGORIES_MATIERES).toContain(matiere.categorie);
      expect(matiere.code).toMatch(/^[A-Z0-9]{2,4}$/);
      expect(matiere.libelle.length).toBeGreaterThan(1);
    }
  });

  it("couvre les repères du système congolais vérifiés dans les sources", () => {
    // Collège (Regard d'Afrique) : SVT, sciences physiques, informatique,
    // arts plastiques, musique, espagnol, chinois.
    const college = CATALOGUE_MATIERES.college.map((m) => m.libelle);
    for (const attendue of [
      "Mathématiques",
      "Sciences physiques",
      "Sciences de la Vie et de la Terre",
      "Informatique",
      "Arts plastiques",
      "Éducation musicale",
      "Espagnol",
      "Chinois",
      "Histoire-Géographie",
      "Kituba",
      "Lingala",
    ]) {
      expect(college).toContain(attendue);
    }

    // Lycée (REMO, séries A / C / D) : philosophie, allemand, sciences.
    const lycee = CATALOGUE_MATIERES.lycee.map((m) => m.libelle);
    for (const attendue of [
      "Philosophie",
      "Allemand",
      "Mathématiques",
      "Sciences physiques",
      "Sciences de la Vie et de la Terre",
    ]) {
      expect(lycee).toContain(attendue);
    }

    // Primaire (programmes congolais) : français, maths, éveil, EPS.
    const primaire = CATALOGUE_MATIERES.primaire.map((m) => m.libelle);
    for (const attendue of [
      "Français",
      "Mathématiques",
      "Éveil au milieu",
      "Éducation civique et morale",
      "Éducation artistique",
    ]) {
      expect(primaire).toContain(attendue);
    }
  });
});
