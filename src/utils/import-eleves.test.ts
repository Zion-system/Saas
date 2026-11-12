import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import {
  analyserEleves,
  COLONNES_MODELE,
  FichierElevesInvalideError,
  genererModeleEleves,
  LIMITE_ELEVES_IMPORT,
  lireLignesBrutes,
  normaliserTelephone,
} from "./import-eleves";

function classeurEnFichier(lignes: string[][]): File {
  const feuille = XLSX.utils.aoa_to_sheet(lignes);
  const classeur = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(classeur, feuille, "Élèves");
  const contenu = XLSX.write(classeur, { type: "array", bookType: "xlsx" });
  return new File([contenu as ArrayBuffer], "eleves.xlsx");
}

const contexte = {
  libellesClasses: ["CP1", "CP2", "6e"],
  existants: [],
};

describe("modèle Excel téléchargeable", () => {
  it("produit un vrai classeur .xlsx avec les colonnes attendues", async () => {
    const fichier = new File(
      [genererModeleEleves()],
      "modele-eleves.xlsx",
    );
    const lignes = await lireLignesBrutes(fichier);

    expect(lignes[0]).toEqual([...COLONNES_MODELE]);
    expect(lignes[1][0]).toBe("Ana");
    expect(lignes[1][5]).toBe("+242 06 123 45 67");
  });
});

describe("lecture du fichier choisi", () => {
  it("décode le classeur en lignes de texte, ordre de colonnes libre", async () => {
    const fichier = classeurEnFichier([
      ["Nom", "Prénom", "Classe"],
      ["MBOUMBA", "Ana", "CP1"],
    ]);
    const lignes = await lireLignesBrutes(fichier);
    const analyse = analyserEleves(lignes, contexte);

    expect(analyse.prets).toHaveLength(1);
    expect(analyse.prets[0]).toMatchObject({
      prenom: "Ana",
      nom: "MBOUMBA",
      classe: "CP1",
      genre: null,
    });
  });

  it("refuse un fichier sans en-têtes reconnaissables", () => {
    expect(() =>
      analyserEleves(
        [["Anne", "MBOUMBA"], ["Junior", "BALOU"]],
        contexte,
      ),
    ).toThrow(FichierElevesInvalideError);
  });
});

describe("contrôle ligne par ligne", () => {
  it("accepte les lignes valides et tolère accents, casse et colonnes en plus", () => {
    const analyse = analyserEleves(
      [
        ["Prénom", "Nom", "Sexe", "Classe", "Remarques"],
        ["Ana", "MBOUMBA", "Fille", " cP1 ", "jumelle de Maria"],
        ["Junior", "BALOU", "M", "6E", ""],
        ["Maria", "MBOUMBA", "", "", ""],
      ],
      contexte,
    );

    expect(analyse.erreurs).toHaveLength(0);
    expect(analyse.prets).toHaveLength(3);
    expect(analyse.prets[0].classe).toBe("CP1");
    expect(analyse.prets[1].classe).toBe("6e");
    expect(analyse.prets[0].genre).toBe("F");
    expect(analyse.prets[1].genre).toBe("M");
    expect(analyse.prets[2].genre).toBeNull();
  });

  it("signale les lignes incomplètes ou non reconnaissables", () => {
    const analyse = analyserEleves(
      [
        ["Prénom", "Nom", "Sexe", "Classe", "Téléphone du parent"],
        ["", "SANS-PRENOM", "F", "CP1", ""],
        ["SANS-NOM", "", "M", "CP1", ""],
        ["SexeInconnu", "TEST", "Z", "CP1", ""],
        ["MauvaiseClasse", "TEST", "F", "Terminale-bis", ""],
        ["MauvaisTel", "TEST", "F", "CP1", "abc"],
        ["Valide", "TEST", "F", "CP1", "+242 06 123 45 67"],
      ],
      contexte,
    );

    expect(analyse.prets).toHaveLength(1);
    expect(analyse.prets[0].telephone).toBe("+242 06 123 45 67");
    expect(analyse.erreurs).toHaveLength(5);
    expect(analyse.erreurs[0].message).toContain("Prénom manquant");
    expect(analyse.erreurs[1].message).toContain("Nom manquant");
    expect(analyse.erreurs[2].message).toContain("F (fille) ou M (garçon)");
    expect(analyse.erreurs[3].message).toContain("n'existe pas");
    expect(analyse.erreurs[4].message).toContain("n'est pas un numéro valable");
  });

  it("garde le numéro de ligne du fichier d'origine dans les erreurs", () => {
    const analyse = analyserEleves(
      [
        ["", ""],
        ["", ""],
        ["Prénom", "Nom"],
        ["", "SANS-PRENOM"],
      ],
      contexte,
    );

    expect(analyse.erreurs[0].ligne).toBe(4);
  });

  it("ignore les lignes entièrement vides", () => {
    const analyse = analyserEleves(
      [
        ["Prénom", "Nom"],
        ["Ana", "MBOUMBA"],
        ["", ""],
        ["", ""],
        ["Junior", "BALOU"],
      ],
      contexte,
    );

    expect(analyse.prets).toHaveLength(2);
    expect(analyse.erreurs).toHaveLength(0);
  });
});

describe("doublons ignorés par défaut", () => {
  it("ignore les doublons internes au fichier et ceux déjà en base", () => {
    const analyse = analyserEleves(
      [
        ["Prénom", "Nom", "Classe"],
        ["Ana", "MBOUMBA", "CP1"],
        ["ana", "mboumba", "CP1"],
        ["Junior", "BALOU", "CP1"],
        ["Ana", "MBOUMBA", "CP2"],
      ],
      {
        libellesClasses: ["CP1", "CP2"],
        existants: [
          { prenom: "Junior", nom: "Balou", classe: "CP1" },
        ],
      },
    );

    expect(analyse.prets).toHaveLength(2);
    expect(analyse.prets.map((eleve) => eleve.classe).sort()).toEqual([
      "CP1",
      "CP2",
    ]);
    expect(analyse.doublons).toHaveLength(2);
    expect(analyse.doublons[0].motif).toBe("fichier");
    expect(analyse.doublons[1].motif).toBe("base");
  });

  it("un élève sans classe entre en doublon avec un élève sans classe", () => {
    const analyse = analyserEleves(
      [
        ["Prénom", "Nom"],
        ["Sans", "Classe"],
        ["Sans", "Classe"],
      ],
      contexte,
    );

    expect(analyse.prets).toHaveLength(1);
    expect(analyse.doublons).toHaveLength(1);
  });
});

describe("protection de performance", () => {
  it("refuse un fichier au-delà de la limite sans rien importer", () => {
    const lignes: string[][] = [["Prénom", "Nom"]];
    for (let i = 0; i < LIMITE_ELEVES_IMPORT + 1; i++) {
      lignes.push([`Prenom${i}`, `Nom${i}`]);
    }

    const analyse = analyserEleves(lignes, contexte);

    expect(analyse.prets).toHaveLength(0);
    expect(analyse.erreurs).toHaveLength(1);
    expect(analyse.erreurs[0].message).toContain("500");
  });
});

describe("validation des téléphones", () => {
  it("accepte les formats congolais courants et refuse le reste", () => {
    expect(normaliserTelephone("+242 06 123 45 67")).toBe(
      "+242 06 123 45 67",
    );
    expect(normaliserTelephone("06 123 45 67")).toBe("06 123 45 67");
    expect(normaliserTelephone("")).toBeNull();
    expect(normaliserTelephone("abc")).toBe("invalide");
    expect(normaliserTelephone("12345")).toBe("invalide");
  });
});
