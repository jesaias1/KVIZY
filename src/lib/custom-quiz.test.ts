import { describe, expect, it } from "vitest";
import { questionSchema } from "./types";
import {
  cleanCustomQuiz,
  customItemProblems,
  customQuizFromHash,
  customQuizQuestions,
  decodeCustomQuiz,
  encodeCustomQuiz,
} from "./custom-quiz";

const quiz = {
  title: "Mettes fødselsdag",
  items: [
    {
      q: "Hvad hedder Mettes hund?",
      a: "Bjørn",
      w: ["Fido", "Rex", "Luna"],
      e: "Han er en schæfer.",
    },
    { q: "Hvor boede Mette som barn?", a: "Odense", w: ["Aalborg"] },
  ],
};

describe("egne quizzer", () => {
  it("accepterer en gyldig quiz og renser tomme svarfelter", () => {
    const cleaned = cleanCustomQuiz({
      ...quiz,
      items: [{ ...quiz.items[0], w: ["Fido", "  ", "Rex"] }],
    });
    expect(cleaned?.items[0].w).toEqual(["Fido", "Rex"]);
  });

  it("afviser tomme, for korte eller dobbelte svar og fremmed input", () => {
    expect(cleanCustomQuiz(null)).toBeNull();
    expect(cleanCustomQuiz({ title: "x", items: [] })).toBeNull();
    expect(
      cleanCustomQuiz({
        title: "x",
        items: [{ q: "Kort?", a: "a", w: ["b"] }],
      }),
    ).toBeNull();
    expect(
      cleanCustomQuiz({
        title: "x",
        items: [{ q: "Hvad hedder hunden?", a: "Bjørn", w: ["bjørn"] }],
      }),
    ).toBeNull();
    expect(
      cleanCustomQuiz({
        title: "x",
        items: Array.from({ length: 31 }, () => quiz.items[0]),
      }),
    ).toBeNull();
  });

  it("peger på, hvad der mangler i en opgave", () => {
    expect(customItemProblems({ q: "Hej", a: "", w: [] })).toEqual([
      "prompt",
      "answer",
      "wrong",
    ]);
    expect(
      customItemProblems({ q: "Hvad hedder hunden?", a: "A", w: ["a"] }),
    ).toEqual(["duplicate"]);
  });

  it("kan sendes som link og læses igen", async () => {
    const cleaned = cleanCustomQuiz(quiz)!;
    const encoded = await encodeCustomQuiz(cleaned);
    expect(encoded).toMatch(/^[zp][A-Za-z0-9_-]+$/);
    expect(await decodeCustomQuiz(encoded)).toEqual(cleaned);
    expect(customQuizFromHash(`#quiz=${encoded}`)).toBe(encoded);
    expect(customQuizFromHash("#andet=1")).toBeNull();
  });

  it("afviser ødelagte eller ondsindede links", async () => {
    expect(await decodeCustomQuiz("zIkkeGyldigt!!")).toBeNull();
    expect(await decodeCustomQuiz("q" + "A".repeat(20))).toBeNull();
    expect(await decodeCustomQuiz("")).toBeNull();
    expect(await decodeCustomQuiz("z" + "A".repeat(50_000))).toBeNull();
  });

  it("laver spørgsmål, spillet kan køre, med det rigtige svar bevaret", () => {
    const questions = customQuizQuestions(cleanCustomQuiz(quiz)!, () => 0.5);
    expect(questions).toHaveLength(2);
    for (const question of questions) {
      expect(questionSchema.safeParse(question).success).toBe(true);
    }
    const first = questions[0];
    expect(
      first.options.find((o) => o.id === first.correctOptionId)?.text,
    ).toBe("Bjørn");
    expect(first.explanation).toBe("Han er en schæfer.");
    expect(questions[1].explanation).toContain("Odense");
    expect(new Set(questions.map((q) => q.id)).size).toBe(2);
  });
});
