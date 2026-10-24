import { Fragment } from "react";

const WORK_TITLE_PATTERN =
  /(\b(?:[Aa]lbummet|[Ff]ilmen|[Rr]omanen|[Bb]ogen|[Vv]ærket|[Mm]aleriet|[Ss]angen|TV-serien|tv-serien|[Ss]erien|[Ee]ventyret)\s+)(?!«)([A-ZÆØÅ0-9][^?.,;:]*?)(?=(?:\s+(?:fra|af|med|som|der|blev|udkom|foregår|handler|spiller|instruerede)\b)|[?.,;:]|$)/gu;

const EXTRA_WORK_TITLE_PATTERN =
  /(\b(?:[Ss]pillet|[Mm]usicalen)\s+)(?!«)([A-ZÆØÅ0-9][^?.,;:]*?)(?=(?:\s+(?:fra|af|med|som|der|blev|udkom|foregår|handler|spiller|instruerede)\b)|[?.,;:]|$)/gu;
const TITLE_OPTION_PROMPT =
  /^(?:Hvilken|Hvilket) (?:af disse )?(?:(?:dansk|international|amerikansk|animeret|klassisk|følgende|nordisk) )?(?:film|TV-serie|serie|album|sang|roman|bog|værk|eventyr|maleri|musik(?:udgivelse)?|spil|musical)\b|^Hvad hedder (?:filmen|TV-serien|serien|albummet|sangen|romanen|bogen|værket|eventyret|maleriet|spillet|musicalen)\b/iu;

export function markQuizTitles(value: string) {
  return value
    .replace(WORK_TITLE_PATTERN, "$1«$2»")
    .replace(EXTRA_WORK_TITLE_PATTERN, "$1«$2»");
}

export function markQuizOptionTitle(value: string, prompt: string) {
  if (!TITLE_OPTION_PROMPT.test(prompt) || /«[^»]+»/.test(value)) return value;
  const creator = value.match(/^(.+?)\s+af\s+(.+)$/u);
  if (creator) return `«${creator[1]}» af ${creator[2]}`;
  const year = value.match(/^(.+?)\s+(\(\d{4}\))$/u);
  if (year) return `«${year[1]}» ${year[2]}`;
  return `«${value}»`;
}

/**
 * Værktitler markeres redaktionelt med danske guillemeter: «Titel».
 * Markeringen bevarer tegnsætningen og giver titlen korrekt kursiv i spillet.
 */
export function QuizText({ children }: { children: string }) {
  const parts = markQuizTitles(children).split(/(«[^»]+»|“[^”]+”)/g);

  return parts.map((part, index) =>
    (part.startsWith("«") && part.endsWith("»")) ||
    (part.startsWith("“") && part.endsWith("”")) ? (
      <em key={`${part}-${index}`}>{part}</em>
    ) : (
      <Fragment key={`${part}-${index}`}>{part}</Fragment>
    ),
  );
}

export function QuizOptionText({
  children,
  prompt,
}: {
  children: string;
  prompt: string;
}) {
  return <QuizText>{markQuizOptionTitle(children, prompt)}</QuizText>;
}
