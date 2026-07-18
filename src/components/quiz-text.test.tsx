import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuizText } from "./quiz-text";

describe("QuizText", () => {
  it("viser markerede værktitler i kursiv med tegnsætningen bevaret", () => {
    const html = renderToStaticMarkup(
      <p>
        <QuizText>Hvem spiller Neo i «The Matrix»?</QuizText>
      </p>,
    );

    expect(html).toBe("<p>Hvem spiller Neo i <em>«The Matrix»</em>?</p>");
  });
});
