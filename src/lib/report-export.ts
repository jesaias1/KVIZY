import type { LocalQuestionReport, Question } from "./types";

export function buildLocalReportExport(
  reports: LocalQuestionReport[],
  questions: Question[],
) {
  const questionsById = new Map(
    questions.map((question) => [question.id, question]),
  );

  return reports.map((report) => {
    const question = questionsById.get(report.questionId);
    return {
      ...report,
      prompt: report.prompt ?? question?.prompt,
      options: report.options ?? question?.options,
      correctOptionId: report.correctOptionId ?? question?.correctOptionId,
      explanation: report.explanation ?? question?.explanation,
    };
  });
}

export function serializeLocalReports(
  reports: LocalQuestionReport[],
  questions: Question[],
) {
  return JSON.stringify(buildLocalReportExport(reports, questions), null, 2);
}
