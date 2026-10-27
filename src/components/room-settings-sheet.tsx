"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { THEMES, themeCategoryIds } from "@/components/theme-sheet";
import {
  CATEGORIES,
  CATEGORY_GROUPS,
  DANISH_CATEGORY_IDS,
  DEFAULT_CATEGORIES,
} from "@/lib/categories";
import { EN_HIDDEN_CATEGORY_IDS } from "@/lib/i18n/en-skip";
import { getLang, locale, t } from "@/lib/i18n";
import { ROOM_COUNTS, ROOM_LIMITS_SEC } from "@/lib/room-protocol";
import type { RoomSettings } from "@/lib/room-settings";

const LEVELS = [
  { value: 2, label: "Let" },
  { value: 3, label: "Almindelig" },
  { value: 4, label: "Svær" },
];

function Segmented<T extends number>({
  label,
  value,
  options,
  format,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  format: (option: T) => string;
  onChange: (option: T) => void;
}) {
  return (
    <div className="rs-row">
      <span>{label}</span>
      <div role="radiogroup" aria-label={label} className="rs-segments">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            className={value === option ? "on" : ""}
            onClick={() => onChange(option)}
          >
            {format(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Vælger spørgsmål, tid, niveau og emner til rummet. Alle emner kan vælges frit. */
export function RoomSettingsSheet({
  settings,
  onChange,
  trigger,
}: {
  settings: RoomSettings;
  onChange: (settings: RoomSettings) => void;
  trigger: React.ReactNode;
}) {
  const [search, setSearch] = useState("");
  const english = getLang() === "en";
  const available = CATEGORIES.filter(
    (category) => !(english && EN_HIDDEN_CATEGORY_IDS.has(category.id)),
  );
  const availableIds = new Set(available.map((category) => category.id));
  const selected = new Set(settings.categoryIds);
  const set = (categoryIds: string[]) =>
    onChange({ ...settings, categoryIds: [...new Set(categoryIds)] });
  const toggle = (id: string) =>
    set(
      selected.has(id)
        ? settings.categoryIds.filter((x) => x !== id)
        : [...settings.categoryIds, id],
    );
  const needle = search.trim().toLocaleLowerCase(locale());
  const matches = (name: string) =>
    !needle || name.toLocaleLowerCase(locale()).includes(needle);
  const defaultIds = DEFAULT_CATEGORIES.filter((c) =>
    availableIds.has(c.id),
  ).map((c) => c.id);

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="bottom"
        className="room-settings-sheet max-h-[92dvh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader>
          <SheetTitle>{t("Spilindstillinger")}</SheetTitle>
          <SheetDescription>
            {t("Vælg præcis de emner, I har lyst til. Der er ingen grænse.")}
          </SheetDescription>
        </SheetHeader>
        <div className="rs-body">
          <Segmented
            label={t("Antal spørgsmål")}
            value={settings.count}
            options={ROOM_COUNTS}
            format={String}
            onChange={(count) => onChange({ ...settings, count })}
          />
          <Segmented
            label={t("Tid pr. spørgsmål")}
            value={settings.limitSec}
            options={ROOM_LIMITS_SEC}
            format={(n) => (n === 0 ? t("Ingen") : `${n} s`)}
            onChange={(limitSec) => onChange({ ...settings, limitSec })}
          />
          <Segmented
            label={t("Niveau")}
            value={settings.level}
            options={LEVELS.map((level) => level.value)}
            format={(n) =>
              t(LEVELS.find((level) => level.value === n)?.label ?? "")
            }
            onChange={(level) => onChange({ ...settings, level })}
          />

          <div className="rs-topics-head">
            <span>
              {t("Emner")} ·{" "}
              {settings.categoryIds.filter((id) => availableIds.has(id)).length}
              /{available.length}
            </span>
            <div>
              <button
                type="button"
                onClick={() => set(available.map((c) => c.id))}
              >
                {t("Alle")}
              </button>
              <button type="button" onClick={() => set(defaultIds)}>
                {t("Standard")}
              </button>
              {!english && (
                <button type="button" onClick={() => set(DANISH_CATEGORY_IDS)}>
                  {t("Kun dansk")}
                </button>
              )}
            </div>
          </div>

          <div className="rs-themes" role="group" aria-label={t("Tema")}>
            {THEMES.map((theme) => {
              const ids = themeCategoryIds(theme.categoryIds);
              if (ids.length < 2) return null;
              return (
                <button key={theme.id} type="button" onClick={() => set(ids)}>
                  {theme.emoji} {t(theme.title)}
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder={t("Søg i kategorier")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {CATEGORY_GROUPS.map((group) => {
            const members = group.ids
              .map((id) => CATEGORIES.find((c) => c.id === id))
              .filter(
                (c): c is NonNullable<typeof c> =>
                  Boolean(c) && availableIds.has(c!.id) && matches(c!.name),
              );
            if (members.length === 0) return null;
            const allOn = members.every((c) => selected.has(c.id));
            return (
              <section key={group.name} className="rs-group">
                <header>
                  <b>
                    {group.emoji} {group.name}
                  </b>
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        allOn
                          ? settings.categoryIds.filter(
                              (id) => !members.some((c) => c.id === id),
                            )
                          : [
                              ...settings.categoryIds,
                              ...members.map((c) => c.id),
                            ],
                      )
                    }
                  >
                    {allOn ? t("Fravælg gruppe") : t("Vælg gruppe")}
                  </button>
                </header>
                <div>
                  {members.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={selected.has(c.id)}
                      className={selected.has(c.id) ? "on" : ""}
                      onClick={() => toggle(c.id)}
                    >
                      {c.emoji} {c.name}
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
