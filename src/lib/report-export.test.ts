import { describe, expect, it } from "vitest";
import { SEED_QUESTIONS } from "@/data/questions";
import type { LocalQuestionReport } from "./types";
import { buildLocalReportExport, serializeLocalReports } from "./report-export";

describe("rapporteksport", () => {
  it("tilføjer spørgsmålet og bevarer spillerens note", () => {
    const question = SEED_QUESTIONS[0];
    const reports: LocalQuestionReport[] = [
      {
        id: "report-1",
        questionId: question.id,
        reason: "bad_options",
        note: "Svarene passer ikke sammen.",
        createdAt: "2026-07-18T12:00:00.000Z",
        synced: false,
      },
    ];

    const [exported] = buildLocalReportExport(reports, [question]);
    expect(exported.note).toBe("Svarene passer ikke sammen.");
    expect(exported.prompt).toBe(question.prompt);
    expect(exported.options).toEqual(question.options);
    expect(JSON.parse(serializeLocalReports(reports, [question]))).toHaveLength(
      1,
    );
  });
});
