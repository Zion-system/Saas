import { describe, expect, it } from "vitest";
import {
  chiffresLocaux,
  estTelephoneComplet,
  formaterTelephoneLocal,
  telephoneCompose,
} from "./telephone";

describe("chiffresLocaux", () => {
  it("garde les chiffres de la saisie locale", () => {
    expect(chiffresLocaux("06 123 45 67")).toBe("061234567");
  });

  it("retire un indicatif 242 collé par l'utilisateur", () => {
    expect(chiffresLocaux("+242 06 123 45 67")).toBe("061234567");
    expect(chiffresLocaux("242061234567")).toBe("061234567");
  });

  it("borne à 9 chiffres", () => {
    expect(chiffresLocaux("061234567890")).toBe("061234567");
  });

  it("renvoie vide pour une saisie sans chiffre", () => {
    expect(chiffresLocaux("")).toBe("");
    expect(chiffresLocaux("abc")).toBe("");
  });
});

describe("formaterTelephoneLocal", () => {
  it("regroupe en 2-3-2-2 un numéro complet", () => {
    expect(formaterTelephoneLocal("061234567")).toBe("06 123 45 67");
  });

  it("formate aussi pendant la frappe progressive", () => {
    expect(formaterTelephoneLocal("0")).toBe("0");
    expect(formaterTelephoneLocal("061")).toBe("06 1");
    expect(formaterTelephoneLocal("06123")).toBe("06 123");
    expect(formaterTelephoneLocal("061234567")).toBe("06 123 45 67");
  });

  it("nettoie une saisie désordonnée", () => {
    expect(formaterTelephoneLocal("06-123.45(67)")).toBe("06 123 45 67");
  });

  it("reforme un numéro stocké avec son indicatif", () => {
    expect(formaterTelephoneLocal("+242 06 123 45 67")).toBe("06 123 45 67");
  });

  it("renvoie vide pour une saisie vide", () => {
    expect(formaterTelephoneLocal("")).toBe("");
  });
});

describe("estTelephoneComplet", () => {
  it("vrai pour 9 chiffres", () => {
    expect(estTelephoneComplet("06 123 45 67")).toBe(true);
  });

  it("faux pour une saisie partielle ou vide", () => {
    expect(estTelephoneComplet("06 123")).toBe(false);
    expect(estTelephoneComplet("")).toBe(false);
  });
});

describe("telephoneCompose", () => {
  it("préfixe l'indicatif +242 au numéro local", () => {
    expect(telephoneCompose("061234567")).toBe("+242 06 123 45 67");
  });

  it("renvoie null quand rien n'est saisi", () => {
    expect(telephoneCompose("")).toBeNull();
  });
});
