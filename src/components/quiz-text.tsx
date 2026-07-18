import { Fragment } from "react";

/**
 * Værktitler markeres redaktionelt med danske guillemeter: «Titel».
 * Markeringen bevarer tegnsætningen og giver titlen korrekt kursiv i spillet.
 */
export function QuizText({ children }: { children: string }) {
  const parts = children.split(/(«[^»]+»)/g);

  return parts.map((part, index) =>
    part.startsWith("«") && part.endsWith("»") ? (
      <em key={`${part}-${index}`}>{part}</em>
    ) : (
      <Fragment key={`${part}-${index}`}>{part}</Fragment>
    ),
  );
}
