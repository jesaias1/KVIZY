import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { EN } from "./en";
import { retitleDefaultName, setGlobalLang, t } from "./index";

// Finder alle danske nøgler i koden (t("…") og konstanter, der oversættes ved
// visning) og kontrollerer, at hver har en engelsk oversættelse.
const ROOT = path.join(process.cwd(), "src");
const DYNAMIC = new Set([
  "modes",
  "typeLabels",
  "LEVEL_HINTS",
  "difficultyModes",
  "SHOWCASE",
  "CORRECT_LINES",
  "WRONG_LINES",
  "PARTIAL_LINES",
  "ACHIEVEMENTS",
  "DIFFICULTY_LABELS",
  "names",
  "RAW_CATEGORY_GROUPS",
  "LEVELS",
]);
const files: string[] = [];
const walk = (dir: string) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "data" || entry.name === "i18n") continue;
      walk(full);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name))
      files.push(full);
  }
};
walk(ROOT);

function collectKeys() {
  const keys = new Map<string, string>();
  const add = (key: string, file: string) => {
    if (key.trim() && /[A-Za-zÆØÅæøå]/.test(key) && !keys.has(key))
      keys.set(key, path.basename(file));
  };
  for (const file of files) {
    const sf = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const walkInit = (node: ts.Node) => {
      if (
        ts.isPropertyAssignment(node) &&
        ts.isIdentifier(node.name) &&
        ["id", "emoji", "icon", "correct", "goal", "value", "color"].includes(
          node.name.text,
        )
      )
        return;
      if (ts.isArrowFunction(node)) return;
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
        add(node.text, file);
      ts.forEachChild(node, walkInit);
    };
    const visit = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "t" &&
        node.arguments[0] &&
        (ts.isStringLiteral(node.arguments[0]) ||
          ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))
      )
        add(node.arguments[0].text, file);
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        DYNAMIC.has(node.name.text) &&
        node.initializer
      )
        walkInit(node.initializer);
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return keys;
}

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("oversættelser", () => {
  const keys = collectKeys();

  it("finder de danske tekster i koden", () => {
    expect(keys.size).toBeGreaterThan(400);
  });

  it("har en engelsk oversættelse til hver dansk tekst", () => {
    const missing = [...keys].filter(([key]) => !(key in EN));
    expect(missing.map(([key, file]) => `${file}: ${key}`)).toEqual([]);
  });

  it("bevarer pladsholdere i oversættelserne", () => {
    const wrong = Object.entries(EN).filter(
      ([da, en]) =>
        JSON.stringify(placeholders(da)) !== JSON.stringify(placeholders(en)),
    );
    expect(wrong.map(([da]) => da)).toEqual([]);
  });

  it("efterlader ikke danske ord i de engelske tekster", () => {
    const allowed = new Set([
      "Skjern Å",
      "Storå",
      "Gudenåen",
      "Odense Å",
      "{avatar} {name}s tur",
    ]);
    const suspicious = Object.entries(EN).filter(
      ([da, en]) =>
        !allowed.has(da) &&
        (/[æøåÆØÅ]/.test(en) ||
          /\b(og|ikke|det|der|som|til|med|spørgsmål|spiller|rigtige)\b/i.test(
            en.replace(/Daily quiz|Danish/g, ""),
          )),
    );
    expect(suspicious.map(([da, en]) => `${da} → ${en}`)).toEqual([]);
  });

  it("slår op og indsætter værdier", () => {
    setGlobalLang("en");
    expect(t("Spil igen")).toBe("Play again");
    expect(t("Klaret · {correct}/{total}", { correct: 7, total: 10 })).toBe(
      "Done · 7/10",
    );
    setGlobalLang("da");
    expect(t("Spil igen")).toBe("Spil igen");
    expect(t("Klaret · {correct}/{total}", { correct: 7, total: 10 })).toBe(
      "Klaret · 7/10",
    );
  });

  it("oversætter kun standardnavne", () => {
    expect(retitleDefaultName("Spiller 2", "en")).toBe("Player 2");
    expect(retitleDefaultName("Hold 3", "en")).toBe("Team 3");
    expect(retitleDefaultName("Player 1", "da")).toBe("Spiller 1");
    expect(retitleDefaultName("Anna", "en")).toBe("Anna");
  });
});
