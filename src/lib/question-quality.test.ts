import { describe, expect, it } from "vitest";
import { SEED_QUESTIONS } from "@/data/questions";
import {
  auditQuestion,
  effectiveQualityScore,
  hasAnswerLeak,
  hasUsefulExplanation,
} from "./question-quality";
import { normalizeText } from "./engine";

describe("automatisk spørgsmålskvalitet", () => {
  it("skjuler generiske faktafelter", () => {
    expect(
      hasUsefulExplanation(
        "Det korrekte svar er København. Det er den centrale sammenhæng, spørgsmålet tester.",
      ),
    ).toBe(false);
    expect(
      hasUsefulExplanation(
        "København blev residensstad i middelalderen og er i dag Danmarks hovedstad.",
      ),
    ).toBe(true);
  });

  it("trækker fejl og advarsler fra kvalitetsscoren", () => {
    const base = SEED_QUESTIONS[0];
    const weak = {
      ...base,
      explanation: "Det korrekte svar er A.",
      sourceLabel: undefined,
      sourceUrl: undefined,
      qualityScore: 70,
    };
    expect(auditQuestion(weak).length).toBeGreaterThanOrEqual(3);
    expect(effectiveQualityScore(weak)).toBeLessThan(70);
  });

  it("banken indeholder ingen emoji-gæt", () => {
    expect(
      SEED_QUESTIONS.some((question) => question.type === ("emoji" as never)),
    ).toBe(false);
  });

  it("har korte, unikke og læsevenlige svarmuligheder", () => {
    for (const question of SEED_QUESTIONS) {
      const optionKeys = question.options.map((option) =>
        normalizeText(option.text),
      );
      expect(new Set(optionKeys).size).toBe(optionKeys.length);
      expect(question.options.every((option) => option.text.length <= 70)).toBe(
        true,
      );
      expect(
        question.options.every(
          (option) =>
            !/^\p{Ll}/u.test(option.text) ||
            /^(iPhone|iPad|iOS|iPod|eBay|macOS)\b/.test(option.text),
        ),
      ).toBe(true);
    }
  });

  it("giver fire svar til alle almindelige spørgsmål", () => {
    for (const question of SEED_QUESTIONS) {
      const expected = question.type === "true_false" ? 2 : 4;
      expect(question.options.length, question.id).toBe(expected);
    }
  });

  it("indeholder ingen maskinagtige udsagn eller gentagne prompts", () => {
    expect(
      SEED_QUESTIONS.some((question) =>
        [
          question.prompt,
          question.explanation,
          ...question.options.map((o) => o.text),
        ].some(
          (text) =>
            /registreret som|centrale sammenhæng|final version|\s{2,}|\.\./i.test(
              text,
            ) || /Ã.|Â.|â[€™“”–—]/.test(text),
        ),
      ),
    ).toBe(false);
    expect(
      new Set(SEED_QUESTIONS.map((question) => normalizeText(question.prompt)))
        .size,
    ).toBe(SEED_QUESTIONS.length);
  });

  it("afviser spørgsmål, der røber svaret i formuleringen", () => {
    const base = SEED_QUESTIONS[0];
    const leaked = {
      ...base,
      prompt: "Hvem grundlagde Ford Motor Company?",
      type: "multiple_choice" as const,
      options: [
        { id: "o1", text: "Henry Ford" },
        { id: "o2", text: "Walter Chrysler" },
        { id: "o3", text: "Louis Chevrolet" },
        { id: "o4", text: "Enzo Ferrari" },
      ],
      correctOptionId: "o1",
    };
    expect(hasAnswerLeak(leaked)).toBe(true);
    expect(
      hasAnswerLeak({
        ...leaked,
        prompt: "Hvilken filosofisk retning forbindes Platon med?",
        options: [
          { id: "o1", text: "Platonisme" },
          { id: "o2", text: "Stoicisme" },
          { id: "o3", text: "Utilitarisme" },
          { id: "o4", text: "Eksistentialisme" },
        ],
      }),
    ).toBe(true);
    expect(SEED_QUESTIONS.some(hasAnswerLeak)).toBe(false);
  });

  it("har behandlet alle indsendte spørgsmålsrapporter", () => {
    const removedIds = [
      "wikithin-brand-industry-Q1420164",
      "wikithin-brand-industry-Q2638082",
      "wikithin-brand-industry-Q5253950",
      "wikithin-psychologist-field-Q217477",
      "wikithin-philosopher-movement-Q859",
      "wikiculture-painting-artist-Q107484305",
      "wikiculture-film-director-Q3998",
      "wd-Q29999-language",
    ];
    expect(
      removedIds.every((id) => !SEED_QUESTIONS.some((q) => q.id === id)),
    ).toBe(true);

    const japan = SEED_QUESTIONS.find((q) => q.id === "wd-Q17-tld");
    expect(japan?.options.map((option) => option.text)).toEqual([
      ".jp",
      ".ja",
      ".jn",
      ".jo",
    ]);
    const redGroed = SEED_QUESTIONS.find(
      (q) => q.id === "wikiculture-food-origin-Q493749",
    );
    expect(redGroed?.options.map((option) => option.text)).toEqual([
      "Danmark",
      "Sverige",
      "Norge",
      "Finland",
    ]);

    const trueFalse = SEED_QUESTIONS.filter((q) => q.type === "true_false");
    const truthCounts = Object.groupBy(
      trueFalse,
      (q) => q.correctOptionId ?? "none",
    );
    expect(
      Math.abs((truthCounts.o1?.length ?? 0) - (truthCounts.o2?.length ?? 0)),
    ).toBeLessThanOrEqual(1);
  });

  it("udelukker maskinelle skabeloner med systematiske kvalitetsfejl", () => {
    const removedTemplates = new Set([
      "airport-country",
      "baked-origin",
      "building-architect",
      "car-model-manufacturer",
      "car-model-designer",
      "danish-song-performer",
      "football-club-stadium",
      "game-developer",
      "philosopher-movement",
      "psychologist-field",
      "scientist-field",
      "software-developer",
      "space-constellation",
    ]);
    expect(
      SEED_QUESTIONS.some((question) =>
        question.tags.some((tag) => removedTemplates.has(tag)),
      ),
    ).toBe(false);
  });

  it("udelukker tvetydige, dublerede og dårligt matchede Wikidata-fakta", () => {
    const removedIds = [
      "wikithin-invention-inventor-Q979",
      "wikithin-invention-inventor-Q1128",
      "wikithin-invention-inventor-Q143899",
      "wikithin-invention-inventor-Q466",
      "wikiculture-food-origin-Q836538",
      "wikiculture-food-origin-Q16834113",
      "variety-072",
      "expansion-105",
      "expansion-117",
      "expansion-173",
      "expansion-112",
    ];
    expect(
      removedIds.every(
        (id) => !SEED_QUESTIONS.some((question) => question.id === id),
      ),
    ).toBe(true);

    const periodicTable = SEED_QUESTIONS.find(
      (question) => question.id === "wikithin-invention-inventor-Q10693",
    );
    expect(periodicTable?.options.map((option) => option.text).sort()).toEqual(
      [
        "Antoine Lavoisier",
        "Dmitrij Mendelejev",
        "John Newlands",
        "Lothar Meyer",
      ].sort(),
    );
    expect(
      SEED_QUESTIONS.filter((question) =>
        question.tags.includes("nordic-mountain-country"),
      ).every((question) => question.options.length === 4),
    ).toBe(true);

    const languageQuestions = SEED_QUESTIONS.filter((question) =>
      question.tags.includes("language"),
    );
    expect(
      languageQuestions.some((question) =>
        /Afghanistan|Australien|Taiwan/.test(question.prompt),
      ),
    ).toBe(false);
    expect(
      languageQuestions.some((question) =>
        /Danmark|Rusland|Frankrig|Spanien/.test(question.prompt),
      ),
    ).toBe(false);
    const andorranLanguage = languageQuestions.find((question) =>
      question.prompt.includes("Andorra"),
    );
    expect(
      andorranLanguage?.options.find(
        (option) => option.id === andorranLanguage.correctOptionId,
      )?.text,
    ).toBe("Catalansk");
  });

  it("skelner mellem opdagelser, udvikling og opfindelser", () => {
    const europa = SEED_QUESTIONS.find(
      (question) => question.id === "wikithin-invention-inventor-Q3143",
    );
    expect(europa?.prompt).toBe("Hvem opdagede Jupiters måne Europa i 1610?");
    expect(europa?.prompt).not.toMatch(/opfind/i);
    expect(europa?.categoryId).toBe("cat-8");
    expect(
      SEED_QUESTIONS.some((question) => /Deal\/No Deal/i.test(question.prompt)),
    ).toBe(false);
  });

  it("viser ikke længere den fejlbehæftede arkitektskabelon", () => {
    expect(
      SEED_QUESTIONS.some((question) =>
        question.tags.includes("building-architect"),
      ),
    ).toBe(false);
  });

  it("bruger plausible svarfamilier i de rapporterede spørgsmål", () => {
    const golf = SEED_QUESTIONS.find((question) =>
      question.prompt.includes("modellen Golf"),
    );
    expect(golf?.options.map((option) => option.text)).toEqual([
      "Volkswagen",
      "Ford",
      "Opel",
      "Peugeot",
    ]);

    const budapest = SEED_QUESTIONS.find((question) =>
      question.prompt.includes("gennem Budapest"),
    );
    expect(budapest?.options.map((option) => option.text)).toEqual([
      "Donau",
      "Rhinen",
      "Seinen",
      "Themsen",
    ]);

    const albums = SEED_QUESTIONS.find((question) =>
      question.prompt.includes("dansk musikudgivelse"),
    );
    expect(
      albums?.options.every((option) => option.text.includes(" af ")),
    ).toBe(true);
  });

  it("blander ikke længere svar fra helt forskellige emnefamilier", () => {
    const expectedOptions: Record<string, string[]> = {
      "Hvilken planet er nærmest Solen?": ["Merkur", "Venus", "Jorden", "Mars"],
      "Hvilken fugl er verdens største?": [
        "Strudsen",
        "Emuen",
        "Kasuarfuglen",
        "Nanduen",
      ],
      "Hvilken onlineencyklopædi blev lanceret i 2001?": [
        "Wikipedia",
        "Britannica Online",
        "Encarta",
        "Citizendium",
      ],
    };
    for (const [prompt, options] of Object.entries(expectedOptions)) {
      expect(
        SEED_QUESTIONS.find(
          (question) => question.prompt === prompt,
        )?.options.map((option) => option.text),
      ).toEqual(options);
    }
  });

  it("gentager ikke relationsord i Wikidata-spørgsmål", () => {
    expect(
      SEED_QUESTIONS.some((question) =>
        /slaget ved\s+slaget ved/i.test(question.prompt),
      ),
    ).toBe(false);
    const gettysburg = SEED_QUESTIONS.find((question) =>
      question.prompt.includes("Gettysburg"),
    );
    expect(gettysburg?.prompt).toBe(
      "I hvilket land fandt slaget ved Gettysburg sted?",
    );
  });
});
