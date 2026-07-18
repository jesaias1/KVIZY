import { Fragment } from "react";

const WORK_TITLE_PATTERN = /(\b(?:[Aa]lbummet|[Ff]ilmen|[Rr]omanen|[Bb]ogen|[Vv]ærket|[Mm]aleriet|[Ss]angen|TV-serien|tv-serien|[Ss]erien|[Ee]ventyret)\s+)(?!«)([A-ZÆØÅ0-9][^?.,;:]*?)(?=(?:\s+(?:fra|af|med|som|der|blev|udkom|foregår|handler|spiller|instruerede)\b)|[?.,;:]|$)/gu;

export function markQuizTitles(value: string) {
  return value.replace(WORK_TITLE_PATTERN, "$1«$2»");
}

/**
 * Værktitler markeres redaktionelt med danske guillemeter: «Titel».
 * Markeringen bevarer tegnsætningen og giver titlen korrekt kursiv i spillet.
 */
export function QuizText({ children }: { children: string }) {
  const parts = markQuizTitles(children).split(/(«[^»]+»)/g);

  return parts.map((part, index) =>
    part.startsWith("«") && part.endsWith("»") ? (
      <em key={`${part}-${index}`}>{part}</em>
    ) : (
      <Fragment key={`${part}-${index}`}>{part}</Fragment>
    ),
  );
}
