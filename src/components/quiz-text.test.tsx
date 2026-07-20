import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  markQuizOptionTitle,
  markQuizTitles,
  QuizOptionText,
  QuizText,
} from "./quiz-text";

describe("QuizText", () => {
  it("viser markerede værktitler i kursiv med tegnsætningen bevaret", () => {
    const html = renderToStaticMarkup(
      <p>
        <QuizText>Hvem spiller Neo i «The Matrix»?</QuizText>
      </p>,
    );

    expect(html).toBe("<p>Hvem spiller Neo i <em>«The Matrix»</em>?</p>");
  });

  it("genkender almindelige titelhenvisninger i ældre spørgsmål", () => {
    expect(markQuizTitles("Hvem udgav albummet Thriller fra 1982?")).toBe(
      "Hvem udgav albummet «Thriller» fra 1982?",
    );
    expect(markQuizTitles("Hvem instruerede filmen The Godfather?")).toBe(
      "Hvem instruerede filmen «The Godfather»?",
    );
    expect(markQuizTitles("Hvad gør filmen spændende?")).toBe(
      "Hvad gør filmen spændende?",
    );
  });

  it("markerer svar, der er værktitler, uden at kursivere ophavsnavnet", () => {
    expect(
      markQuizOptionTitle(
        "Aquarium af Aqua",
        "Hvilken dansk musikudgivelse kom først?",
      ),
    ).toBe("«Aquarium» af Aqua");
    const html = renderToStaticMarkup(
      <QuizOptionText prompt="Hvilken film vandt prisen?">
        The Godfather
      </QuizOptionText>,
    );
    expect(html).toBe("<em>«The Godfather»</em>");
  });

  it("kursiverer ikke personnavne i instruktørspørgsmål", () => {
    expect(
      markQuizOptionTitle(
        "Francis Ford Coppola",
        "Hvem instruerede filmen The Godfather?",
      ),
    ).toBe("Francis Ford Coppola");
  });
});
