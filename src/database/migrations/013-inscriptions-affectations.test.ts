import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrations } from "./index";

type Database = InstanceType<
  Awaited<ReturnType<typeof sqlite3InitModule>>["oo1"]["DB"]
>;

let database: Database;

function appliquerMigration(migration: (typeof migrations)[number]): void {
  database.exec("BEGIN IMMEDIATE;");
  try {
    database.exec(migration.sql);
    database.exec({
      sql: "INSERT INTO schema_migrations (version, name) VALUES (?, ?);",
      bind: [migration.version, migration.name],
    });
    database.exec("COMMIT;");
  } catch (error) {
    try {
      database.exec("ROLLBACK;");
    } catch {
      // Préserver l’erreur initiale.
    }
    throw error;
  }
}

function creerInscription({
  id,
  eleve = "eleve-1",
  annee = "annee-1",
  etablissement = "etablissement-1",
  preinscription = null,
  etat = "CONFIRMEE",
}: {
  id: string;
  eleve?: string;
  annee?: string;
  etablissement?: string;
  preinscription?: string | null;
  etat?: string;
}): void {
  database.exec({
    sql: `
      INSERT INTO inscription (
        id_inscription, id_eleve, id_annee_scolaire,
        id_etablissement, id_preinscription, etat_inscription
      ) VALUES (?, ?, ?, ?, ?, ?);
    `,
    bind: [id, eleve, annee, etablissement, preinscription, etat],
  });
}

function creerAffectation({
  id,
  inscription,
  classe = "classe-1",
  etablissement = "etablissement-1",
  debut = "2026-09-01",
  fin = null,
}: {
  id: string;
  inscription: string;
  classe?: string;
  etablissement?: string;
  debut?: string;
  fin?: string | null;
}): void {
  database.exec({
    sql: `
      INSERT INTO affectation_classe (
        id_affectation_classe, id_inscription, id_classe_annuelle,
        id_etablissement, date_debut, date_fin
      ) VALUES (?, ?, ?, ?, ?, ?);
    `,
    bind: [id, inscription, classe, etablissement, debut, fin],
  });
}

function lireCompte(
  sql: string,
  bind: (string | number | null)[] = [],
): number {
  return Number(
    database.exec({
      sql,
      bind,
      rowMode: "object",
      returnValue: "resultRows",
    })[0]?.count,
  );
}

function executerTransaction(operation: () => void): void {
  database.exec("BEGIN IMMEDIATE;");
  try {
    operation();
    database.exec("COMMIT;");
  } catch (error) {
    try {
      database.exec("ROLLBACK;");
    } catch {
      // Préserver l’erreur initiale.
    }
    throw error;
  }
}

beforeEach(async () => {
  const sqlite3 = await sqlite3InitModule();
  database = new sqlite3.oo1.DB(":memory:");
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec(`
    CREATE TABLE schema_migrations (
      version INTEGER PRIMARY KEY CHECK (version > 0),
      name TEXT NOT NULL
    );
  `);

  for (const migration of migrations.slice(0, 12)) {
    appliquerMigration(migration);
  }

  database.exec(`
    INSERT INTO etablissement (id_etablissement)
      VALUES ('etablissement-1'), ('etablissement-2');
    INSERT INTO annee_scolaire (id_annee_scolaire, id_etablissement)
      VALUES
        ('annee-1', 'etablissement-1'),
        ('annee-2', 'etablissement-1'),
        ('annee-autre-etablissement', 'etablissement-2');
    INSERT INTO niveau_enseignement (id_niveau) VALUES ('niveau-1');
    INSERT INTO modele_classe (id_modele_classe) VALUES ('modele-1');
    INSERT INTO classe_annuelle (
      id_classe_annuelle, id_annee_scolaire, id_niveau,
      id_modele_classe, id_etablissement
    ) VALUES
      ('classe-1', 'annee-1', 'niveau-1', 'modele-1', 'etablissement-1'),
      ('classe-1-bis', 'annee-1', 'niveau-1', 'modele-1', 'etablissement-1'),
      ('classe-2', 'annee-2', 'niveau-1', 'modele-1', 'etablissement-1'),
      ('classe-autre-etablissement', 'annee-autre-etablissement',
       'niveau-1', 'modele-1', 'etablissement-2');
    INSERT INTO eleve (id_eleve, id_etablissement)
      VALUES
        ('eleve-1', 'etablissement-1'),
        ('eleve-2', 'etablissement-1'),
        ('eleve-3', 'etablissement-1'),
        ('eleve-autre-etablissement', 'etablissement-2');
    INSERT INTO candidature (id_candidature) VALUES ('candidature-1');
    INSERT INTO preinscription (id_preinscription, id_candidature)
      VALUES ('preinscription-candidat', 'candidature-1');
    INSERT INTO preinscription (id_preinscription, id_eleve)
      VALUES ('preinscription-eleve', 'eleve-1');
    INSERT INTO type_frais (id_type_frais, code_type_frais, libelle)
      VALUES ('type-1', 'SCOLARITE', 'Scolarité');
    INSERT INTO periode_facturation (
      id_periode_facturation, id_annee_scolaire,
      date_debut_periode, date_fin_periode
    ) VALUES ('periode-1', 'annee-1', '2026-09-01', '2027-06-01');
    INSERT INTO campagne_facturation (
      id_campagne_facturation, id_annee_scolaire, id_type_frais,
      id_periode_facturation, auteur_lancement
    ) VALUES ('campagne-1', 'annee-1', 'type-1', 'periode-1', 'auteur-1');
    INSERT INTO execution_campagne_facturation (
      id_execution_campagne, id_campagne_facturation
    ) VALUES ('execution-1', 'campagne-1');
    INSERT INTO creance (
      id_creance, id_eleve, id_annee_scolaire, id_type_frais,
      libelle_type_frais_snapshot, id_periode_facturation,
      origine_creation, id_campagne_facturation, id_execution_campagne,
      montant_brut_fcfa, montant_remise_fcfa, montant_net_initial_fcfa
    ) VALUES (
      'creance-legacy', 'eleve-1', 'annee-1', 'type-1',
      'Scolarité', 'periode-1', 'CAMPAGNE', 'campagne-1', 'execution-1',
      12000, 0, 12000
    );
  `);

  appliquerMigration(migrations[12]!);
});

afterEach(() => {
  database.close();
});

describe("migration inscriptions_affectations", () => {
  it("s’enregistre après 012 et préserve les données et le schéma financier existants", () => {
    expect(migrations.map((migration) => migration.version)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    ]);
    expect(migrations[12]).toMatchObject({
      version: 13,
      name: "inscriptions_affectations",
    });
    expect(lireCompte("SELECT COUNT(*) AS count FROM classe_annuelle;")).toBe(
      4,
    );
    expect(lireCompte("SELECT COUNT(*) AS count FROM eleve;")).toBe(4);
    expect(lireCompte("SELECT COUNT(*) AS count FROM preinscription;")).toBe(2);
    expect(lireCompte("SELECT COUNT(*) AS count FROM creance;")).toBe(1);
    expect(
      database
        .exec({
          sql: "PRAGMA table_info(classe_annuelle);",
          rowMode: "object",
          returnValue: "resultRows",
        })
        .some((column) => column.name === "capacite_max"),
    ).toBe(true);
    expect(
      database
        .exec({
          sql: "PRAGMA foreign_key_list(creance);",
          rowMode: "object",
          returnValue: "resultRows",
        })
        .some((foreignKey) =>
          ["inscription", "affectation_classe"].includes(
            String(foreignKey.table),
          ),
        ),
    ).toBe(false);
  });

  it("valide les états, l’unicité des inscriptions confirmées et la conservation des annulées", () => {
    creerInscription({ id: "inscription-brouillon", etat: "BROUILLON" });
    creerInscription({ id: "inscription-annulee", etat: "ANNULEE" });
    creerInscription({ id: "inscription-confirmee" });

    expect(() =>
      creerInscription({ id: "inscription-confirmee-en-double" }),
    ).toThrow();
    expect(() =>
      creerInscription({ id: "inscription-etat-invalide", etat: "EN_ATTENTE" }),
    ).toThrow();
    expect(() =>
      database.exec(
        "DELETE FROM inscription WHERE id_inscription = 'inscription-annulee';",
      ),
    ).toThrow();
    expect(
      lireCompte(
        "SELECT COUNT(*) AS count FROM inscription WHERE id_inscription = 'inscription-annulee';",
      ),
    ).toBe(1);
  });

  it("permet une inscription directe et n’autorise qu’une inscription par préinscription", () => {
    creerInscription({ id: "inscription-directe", etat: "BROUILLON" });
    creerInscription({
      id: "inscription-preinscrite",
      preinscription: "preinscription-candidat",
      eleve: "eleve-2",
      etat: "BROUILLON",
    });

    expect(() =>
      creerInscription({
        id: "inscription-preinscription-double",
        preinscription: "preinscription-candidat",
        eleve: "eleve-3",
        etat: "BROUILLON",
      }),
    ).toThrow();
    expect(() =>
      creerInscription({
        id: "inscription-eleve-preinscription-incoherente",
        preinscription: "preinscription-eleve",
        eleve: "eleve-2",
        etat: "BROUILLON",
      }),
    ).toThrow();
  });

  it("protège l’élève d’une préinscription liée tout en conservant le cas candidature à NULL", () => {
    creerInscription({
      id: "inscription-preinscription-eleve",
      preinscription: "preinscription-eleve",
      etat: "BROUILLON",
    });
    creerInscription({
      id: "inscription-preinscription-candidature",
      preinscription: "preinscription-candidat",
      eleve: "eleve-2",
      etat: "BROUILLON",
    });

    expect(() =>
      database.exec({
        sql: "UPDATE preinscription SET id_eleve = NULL WHERE id_preinscription = ?;",
        bind: ["preinscription-eleve"],
      }),
    ).toThrow(
      "L’élève d’une préinscription liée doit correspondre à celui de l’inscription.",
    );
    expect(() =>
      database.exec({
        sql: "UPDATE preinscription SET id_eleve = ? WHERE id_preinscription = ?;",
        bind: ["eleve-2", "preinscription-eleve"],
      }),
    ).toThrow();
    database.exec({
      sql: "UPDATE preinscription SET id_eleve = NULL WHERE id_preinscription = ?;",
      bind: ["preinscription-candidat"],
    });
    expect(() =>
      database.exec({
        sql: "UPDATE preinscription SET id_eleve = ? WHERE id_preinscription = ?;",
        bind: ["eleve-3", "preinscription-candidat"],
      }),
    ).toThrow();
    expect(
      database.exec({
        sql: "SELECT id_eleve FROM preinscription WHERE id_preinscription = ?;",
        bind: ["preinscription-candidat"],
        rowMode: "object",
        returnValue: "resultRows",
      })[0]?.id_eleve,
    ).toBeNull();
  });

  it("vérifie l’existence et la cohérence d’établissement des références", () => {
    expect(() =>
      creerInscription({
        id: "inscription-eleve-inconnue",
        eleve: "eleve-absent",
      }),
    ).toThrow();
    expect(() =>
      creerInscription({
        id: "inscription-annee-inconnue",
        annee: "annee-absente",
      }),
    ).toThrow();
    expect(() =>
      creerInscription({
        id: "inscription-etablissement-croise",
        eleve: "eleve-autre-etablissement",
      }),
    ).toThrow();
  });

  it("permet l’affectation différée et impose une seule affectation courante", () => {
    creerInscription({ id: "inscription-sans-affectation", eleve: "eleve-1" });
    creerInscription({ id: "inscription-avec-affectation", eleve: "eleve-2" });
    creerAffectation({
      id: "affectation-1",
      inscription: "inscription-avec-affectation",
    });

    expect(() =>
      creerAffectation({
        id: "affectation-courante-double",
        inscription: "inscription-avec-affectation",
        classe: "classe-1-bis",
      }),
    ).toThrow();
    expect(
      lireCompte("SELECT COUNT(*) AS count FROM affectation_classe;"),
    ).toBe(1);
  });

  it("clôture une affectation avant d’en créer une nouvelle et conserve les deux lignes", () => {
    creerInscription({ id: "inscription-changement", eleve: "eleve-1" });
    creerAffectation({
      id: "affectation-ancienne",
      inscription: "inscription-changement",
    });

    executerTransaction(() => {
      database.exec({
        sql: `UPDATE affectation_classe SET date_fin = ? WHERE id_affectation_classe = ?;`,
        bind: ["2027-01-15", "affectation-ancienne"],
      });
      creerAffectation({
        id: "affectation-nouvelle",
        inscription: "inscription-changement",
        classe: "classe-1-bis",
        debut: "2027-01-16",
      });
    });

    expect(
      lireCompte("SELECT COUNT(*) AS count FROM affectation_classe;"),
    ).toBe(2);
    expect(
      lireCompte(
        "SELECT COUNT(*) AS count FROM affectation_classe WHERE date_fin IS NULL;",
      ),
    ).toBe(1);
    expect(() =>
      database.exec(
        "DELETE FROM affectation_classe WHERE id_affectation_classe = 'affectation-ancienne';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE affectation_classe SET date_fin = '2027-02-01' WHERE id_affectation_classe = 'affectation-ancienne';",
      ),
    ).toThrow();
  });

  it("interdit les chevauchements tout en acceptant des intervalles semi-ouverts adjacents", () => {
    creerInscription({ id: "inscription-periodes", eleve: "eleve-1" });
    creerAffectation({
      id: "affectation-periode-1",
      inscription: "inscription-periodes",
      debut: "2026-09-01",
      fin: "2026-10-01",
    });
    creerAffectation({
      id: "affectation-periode-adjacente",
      inscription: "inscription-periodes",
      classe: "classe-1-bis",
      debut: "2026-10-01",
      fin: "2026-11-01",
    });

    expect(() =>
      creerAffectation({
        id: "affectation-periode-chevauchante",
        inscription: "inscription-periodes",
        debut: "2026-10-31",
        fin: "2026-11-15",
      }),
    ).toThrow();
    expect(() =>
      creerAffectation({
        id: "affectation-periode-ouverte-chevauchante",
        inscription: "inscription-periodes",
        debut: "2026-10-31",
      }),
    ).toThrow();
    expect(
      lireCompte("SELECT COUNT(*) AS count FROM affectation_classe;"),
    ).toBe(2);
  });

  it("empêche de changer l’élève d’une inscription dès qu’une affectation existe", () => {
    creerInscription({ id: "inscription-eleve-modifiable", eleve: "eleve-1" });
    creerInscription({ id: "inscription-eleve-fige", eleve: "eleve-2" });
    creerAffectation({
      id: "affectation-eleve-fige",
      inscription: "inscription-eleve-fige",
    });

    database.exec({
      sql: "UPDATE inscription SET id_eleve = ? WHERE id_inscription = ?;",
      bind: ["eleve-3", "inscription-eleve-modifiable"],
    });
    expect(() =>
      database.exec({
        sql: "UPDATE inscription SET id_eleve = ? WHERE id_inscription = ?;",
        bind: ["eleve-3", "inscription-eleve-fige"],
      }),
    ).toThrow();
  });

  it("refuse une affectation d’une classe d’une autre année ou d’un autre établissement", () => {
    creerInscription({ id: "inscription-annee-1", eleve: "eleve-1" });
    creerInscription({
      id: "inscription-autre-etablissement",
      eleve: "eleve-autre-etablissement",
      annee: "annee-autre-etablissement",
      etablissement: "etablissement-2",
    });

    expect(() =>
      creerAffectation({
        id: "affectation-mauvaise-annee",
        inscription: "inscription-annee-1",
        classe: "classe-2",
      }),
    ).toThrow();
    expect(() =>
      creerAffectation({
        id: "affectation-mauvais-etablissement",
        inscription: "inscription-annee-1",
        classe: "classe-autre-etablissement",
      }),
    ).toThrow();
    expect(() =>
      creerAffectation({
        id: "affectation-etablissement-croise",
        inscription: "inscription-autre-etablissement",
        classe: "classe-1",
      }),
    ).toThrow();
  });

  it("contrôle la capacité courante et traite une capacité NULL comme non renseignée", () => {
    database.exec(
      "UPDATE classe_annuelle SET capacite_max = 1 WHERE id_classe_annuelle = 'classe-1';",
    );
    creerInscription({ id: "inscription-capacite-1", eleve: "eleve-1" });
    creerInscription({ id: "inscription-capacite-2", eleve: "eleve-2" });
    creerAffectation({
      id: "affectation-capacite-1",
      inscription: "inscription-capacite-1",
    });

    expect(() =>
      creerAffectation({
        id: "affectation-capacite-2",
        inscription: "inscription-capacite-2",
      }),
    ).toThrow();

    database.exec({
      sql: "UPDATE affectation_classe SET date_fin = ? WHERE id_affectation_classe = ?;",
      bind: ["2027-01-15", "affectation-capacite-1"],
    });
    creerAffectation({
      id: "affectation-capacite-2",
      inscription: "inscription-capacite-2",
      debut: "2027-01-16",
    });
    expect(() =>
      database.exec(
        "UPDATE classe_annuelle SET capacite_max = 0 WHERE id_classe_annuelle = 'classe-1';",
      ),
    ).toThrow();

    creerInscription({ id: "inscription-sans-limite-1", eleve: "eleve-3" });
    database.exec(
      "UPDATE classe_annuelle SET capacite_max = NULL WHERE id_classe_annuelle = 'classe-1';",
    );
    creerAffectation({
      id: "affectation-sans-limite-1",
      inscription: "inscription-sans-limite-1",
    });
    expect(
      database.exec({
        sql: "SELECT capacite_max FROM classe_annuelle WHERE id_classe_annuelle = 'classe-1';",
        rowMode: "object",
        returnValue: "resultRows",
      })[0]?.capacite_max,
    ).toBeNull();
  });

  it("rejette les dates invalides et vérifie l’intégrité après les opérations", () => {
    creerInscription({ id: "inscription-dates", eleve: "eleve-1" });
    expect(() =>
      creerAffectation({
        id: "affectation-date-invalide",
        inscription: "inscription-dates",
        debut: "2026-13-40",
      }),
    ).toThrow();
    expect(() =>
      creerAffectation({
        id: "affectation-fin-invalide",
        inscription: "inscription-dates",
        debut: "2026-09-01",
        fin: "2026-08-31",
      }),
    ).toThrow();
    expect(
      database.exec({
        sql: "PRAGMA foreign_key_check;",
        rowMode: "object",
        returnValue: "resultRows",
      }),
    ).toEqual([]);
    expect(
      database.exec({
        sql: "PRAGMA integrity_check;",
        rowMode: "object",
        returnValue: "resultRows",
      })[0]?.integrity_check,
    ).toBe("ok");
  });
});
