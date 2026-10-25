"use client";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EN_HIDDEN_CATEGORY_IDS } from "@/lib/i18n/en-skip";
import { getLang, t } from "@/lib/i18n";

// Temaer er færdige kategorivalg til en bestemt aften. De bruger de samme
// spørgsmål som resten af spillet, så der er ikke noget ekstra at vedligeholde.
export const THEMES: {
  id: string;
  emoji: string;
  title: string;
  text: string;
  categoryIds: string[];
}[] = [
  {
    id: "julefrokost",
    emoji: "🎄",
    title: "Julefrokost",
    text: "Lette og sjove spørgsmål til hele bordet",
    categoryIds: [
      "cat-1",
      "cat-2",
      "cat-36",
      "cat-41",
      "cat-44",
      "cat-48",
      "cat-49",
      "cat-50",
      "cat-59",
    ],
  },
  {
    id: "nytaar",
    emoji: "🎆",
    title: "Nytårsaften",
    text: "Mærkelige fakta, historie og festmusik",
    categoryIds: ["cat-1", "cat-5", "cat-21", "cat-45", "cat-48", "cat-53"],
  },
  {
    id: "film",
    emoji: "🎬",
    title: "Filmaften",
    text: "Film, serier og Hollywood",
    categoryIds: ["cat-17", "cat-18", "cat-19", "cat-20", "cat-62", "cat-64"],
  },
  {
    id: "retro",
    emoji: "📼",
    title: "Retro",
    text: "80’erne, 90’erne og 00’erne",
    categoryIds: ["cat-49", "cat-50", "cat-51", "cat-19", "cat-21", "cat-24"],
  },
  {
    id: "hytte",
    emoji: "🏕️",
    title: "Hyttetur",
    text: "Natur, dyr, geografi og hverdagsviden",
    categoryIds: [
      "cat-1",
      "cat-6",
      "cat-28",
      "cat-29",
      "cat-30",
      "cat-32",
      "cat-47",
      "cat-59",
    ],
  },
  {
    id: "familie",
    emoji: "👨‍👩‍👧",
    title: "Familie og børn",
    text: "Spørgsmål hele familien kan være med på",
    categoryIds: [
      "cat-1",
      "cat-8",
      "cat-28",
      "cat-33",
      "cat-47",
      "cat-62",
      "cat-63",
    ],
  },
  {
    id: "musik",
    emoji: "🎤",
    title: "Musikquiz",
    text: "Musik gennem årtierne",
    categoryIds: ["cat-21", "cat-22", "cat-23", "cat-50", "cat-51", "cat-52"],
  },
  {
    id: "hjerne",
    emoji: "🧠",
    title: "Hjernegymnastik",
    text: "Videnskab, rummet og tankenødder",
    categoryIds: [
      "cat-7",
      "cat-8",
      "cat-9",
      "cat-11",
      "cat-12",
      "cat-45",
      "cat-46",
    ],
  },
  {
    id: "sport",
    emoji: "🏟️",
    title: "Sportsaften",
    text: "Fodbold og sport",
    categoryIds: ["cat-25", "cat-26", "cat-27"],
  },
  {
    id: "mad",
    emoji: "🍽️",
    title: "Madaften",
    text: "Mad, bagning og drikke",
    categoryIds: ["cat-41", "cat-42", "cat-43", "cat-44", "cat-65"],
  },
  {
    id: "fans",
    emoji: "🪄",
    title: "Fantasy og fans",
    text: "Ringenes Herre, Star Wars, Harry Potter og myter",
    categoryIds: ["cat-31", "cat-32", "cat-33", "cat-60", "cat-61", "cat-62"],
  },
];

/** Kategorier, der giver mening i det aktuelle sprog. */
export const themeCategoryIds = (categoryIds: string[]) =>
  getLang() === "en"
    ? categoryIds.filter((id) => !EN_HIDDEN_CATEGORY_IDS.has(id))
    : categoryIds;

export function ThemeSheet({
  trigger,
  onPick,
}: {
  trigger: React.ReactNode;
  onPick: (categoryIds: string[]) => void;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader>
          <SheetTitle>{t("Spil efter tema")}</SheetTitle>
        </SheetHeader>
        <div className="grid gap-2 px-4 pb-5 sm:grid-cols-2">
          {THEMES.map((theme) => {
            const ids = themeCategoryIds(theme.categoryIds);
            if (ids.length < 2) return null;
            return (
              <SheetClose asChild key={theme.id}>
                <button
                  type="button"
                  className="theme-card"
                  onClick={() => onPick(ids)}
                >
                  <span aria-hidden="true">{theme.emoji}</span>
                  <b>{t(theme.title)}</b>
                  <small>{t(theme.text)}</small>
                </button>
              </SheetClose>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
