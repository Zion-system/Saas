import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import {
  COLONNES_EXPORT,
  genererExportEleves,
  lignesExportEleves,
} from "./export-eleves";

describe("lignes de l'export", () => {
  it("met les colonnes attendues en première ligne, même sans élève", () => {
    const lignes = lignesExportEleves([]);

    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toEqual([...COLONNES_EXPORT]);
  });

  it("transforme les valeurs manquantes en cellules vides (jamais null)", () => {
    const lignes = lignesExportEleves([
      {
        prenom: "Ana",
        nom: "MBOUMBA",
        sexe: null,
        matricule: null,
        classe: null,
        parent: null,
        telephone: null,
        statut: "Sans inscription",
      },
    ]);

    expect(lignes[1]).toEqual([
      "Ana",
      "MBOUMBA",
      "",
      "",
      "",
      "",
      "",
      "Sans inscription",
    ]);
  });

  it("conserve toutes les informations renseignées, dans l'ordre des colonnes", () => {
    const lignes = lignesExportEleves([
      {
        prenom: "Jean",
        nom: "BALOU",
        sexe: "M",
        matricule: "2627-0002",
        classe: "CP2",
        parent: "M. NGOMA",
        telephone: "+242 05 555 44 33",
        statut: "Inscrit",
      },
    ]);

    expect(lignes[1]).toEqual([
      "Jean",
      "BALOU",
      "M",
      "2627-0002",
      "CP2",
      "M. NGOMA",
      "+242 05 555 44 33",
      "Inscrit",
    ]);
  });
});

describe("classeur Excel de l'export", () => {
  it("produit un vrai .xlsx relisible, avec l'en-tête et une ligne par élève", () => {
    const tampon = genererExportEleves([
      {
        prenom: "Ana",
        nom: "MBOUMBA",
        sexe: "F",
        matricule: "2627-0001",
        classe: "CP1",
        parent: "Mme LOUANGO",
        telephone: "+242 06 123 45 67",
        statut: "Inscrit",
      },
      {
        prenom: "Jean",
        nom: "BALOU",
        sexe: "M",
        matricule: null,
        classe: "CP2",
        parent: null,
        telephone: null,
        statut: "Inscrit",
      },
    ]);

    const classeur = XLSX.read(new Uint8Array(tampon), { type: "array" });
    expect(classeur.SheetNames[0]).toBe("Élèves");

    const feuille = classeur.Sheets[classeur.SheetNames[0]];
    const lignes = XLSX.utils.sheet_to_json<string[]>(feuille, {
      header: 1,
      raw: false,
      defval: "",
    });

    expect(lignes).toHaveLength(3);
    expect(lignes[0]).toEqual([...COLONNES_EXPORT]);
    expect(lignes[1]).toEqual([
      "Ana",
      "MBOUMBA",
      "F",
      "2627-0001",
      "CP1",
      "Mme LOUANGO",
      "+242 06 123 45 67",
      "Inscrit",
    ]);
    expect(lignes[2]).toEqual([
      "Jean",
      "BALOU",
      "M",
      "",
      "CP2",
      "",
      "",
      "Inscrit",
    ]);
  });
});
