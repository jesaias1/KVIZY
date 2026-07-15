import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("ai", () => ({
  Output: { object: (value: unknown) => value },
  generateText: vi.fn(async () => ({
    output: {
      questions: [
        {
          prompt: "Hvilken dansk ø ligger mellem Jylland og Sjælland?",
          type: "multiple_choice",
          secondaryCategoryIds: [],
          difficulty: 3,
          options: ["Fyn", "Læsø", "Fanø", "Anholt"],
          correctAnswer: "Fyn",
          explanation:
            "Fyn ligger centralt mellem Jylland og Sjælland og forbindes med begge via broer.",
          sourceLabel: "Danmarks Statistik – geografi",
          tags: ["danmark", "geografi"],
          timeSensitive: false,
        },
      ],
    },
  })),
}));
describe("AI-generator med mocked provider", () => {
  beforeEach(() => vi.clearAllMocks());
  it("accepterer kun et schema- og kvalitetsvalideret batch", async () => {
    const { generateQuestions } = await import("./generator");
    const result = await generateQuestions({
      categoryId: "cat-2",
      categoryName: "Danmark",
      difficulty: 3,
      count: 1,
      type: "multiple_choice",
    });
    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
    expect(result.accepted[0].status).toBe("draft");
    expect(result.accepted[0].origin).toBe("ai");
  });
});
