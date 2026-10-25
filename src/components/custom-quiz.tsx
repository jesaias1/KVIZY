"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Link2,
  Minus,
  Play,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CUSTOM_EXPLANATION_MAX,
  CUSTOM_LINK_SOFT_LIMIT,
  CUSTOM_MAX_QUESTIONS,
  CUSTOM_OPTION_MAX,
  CUSTOM_PROMPT_MAX,
  CUSTOM_TITLE_MAX,
  cleanCustomQuiz,
  customItemProblems,
  customQuizLink,
  encodeCustomQuiz,
  type CustomQuiz,
} from "@/lib/custom-quiz";
import { t } from "@/lib/i18n";

const DRAFT_KEY = "kvizy-custom-draft-v1";

type Draft = {
  title: string;
  items: { q: string; a: string; w: string[]; e: string }[];
};

const blankItem = () => ({ q: "", a: "", w: ["", "", ""], e: "" });
const blankDraft = (): Draft => ({ title: "", items: [blankItem()] });

function loadDraft(): Draft {
  try {
    const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null") as Draft;
    if (raw && Array.isArray(raw.items) && raw.items.length > 0)
      return {
        title: typeof raw.title === "string" ? raw.title : "",
        items: raw.items.slice(0, CUSTOM_MAX_QUESTIONS).map((item) => ({
          q: String(item.q ?? ""),
          a: String(item.a ?? ""),
          w: [0, 1, 2].map((i) => String(item.w?.[i] ?? "")),
          e: String(item.e ?? ""),
        })),
      };
  } catch {
    // Ingen kladde endnu.
  }
  return blankDraft();
}

const toQuiz = (draft: Draft): CustomQuiz | null =>
  cleanCustomQuiz({
    title: draft.title,
    items: draft.items.map((item) => ({
      q: item.q,
      a: item.a,
      w: item.w,
      e: item.e,
    })),
  });

/** Antal spillere, som en egen quiz spilles med. */
function PlayerStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="cq-players" role="group" aria-label={t("Antal spillere")}>
      <span>{t("Antal spillere")}</span>
      <div>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label={t("Færre spillere")}
          disabled={value <= 1}
          onClick={() => onChange(value - 1)}
        >
          <Minus />
        </Button>
        <b aria-live="polite">{value}</b>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label={t("Flere spillere")}
          disabled={value >= 8}
          onClick={() => onChange(value + 1)}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Lav din egen quiz
// ════════════════════════════════════════════════════════════
export function CustomQuizBuilder({
  onPlay,
  onBack,
}: {
  onPlay: (quiz: CustomQuiz, players: number) => void;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [players, setPlayers] = useState(2);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Kladden huskes bare ikke.
    }
  }, [draft]);

  const quiz = useMemo(() => toQuiz(draft), [draft]);
  const problems = draft.items.map((item) => customItemProblems(item));
  const readyCount = problems.filter((p) => p.length === 0).length;

  const update = (index: number, patch: Partial<Draft["items"][number]>) => {
    setLink("");
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    }));
  };

  const makeLink = async () => {
    if (!quiz) return;
    const encoded = await encodeCustomQuiz(quiz);
    const url = customQuizLink(window.location.origin, encoded);
    setLink(url);
    const share = navigator.share?.bind(navigator);
    if (share) {
      try {
        await share({
          title: quiz.title || "KVIZY",
          text: t("Spil min quiz på KVIZY"),
          url,
        });
        return;
      } catch {
        // Deling blev afbrudt; linket vises nedenfor, så det kan kopieres.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Brugeren kan kopiere fra feltet.
    }
  };

  return (
    <div className="cq mx-auto max-w-2xl">
      <header className="cq-head">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          {t("Tilbage")}
        </Button>
        <h1>{t("Lav din egen quiz")}</h1>
        <p>
          {t(
            "Skriv spørgsmål om jer selv, jeres familie eller jeres arbejdsplads. Del quizzen som et link – ingen log ind, og intet gemmes på en server.",
          )}
        </p>
      </header>

      <label className="cq-field">
        <span>{t("Navn på quizzen")}</span>
        <Input
          value={draft.title}
          maxLength={CUSTOM_TITLE_MAX}
          placeholder={t("Fx Mettes fødselsdag")}
          onChange={(event) => {
            setLink("");
            setDraft({ ...draft, title: event.target.value });
          }}
        />
      </label>

      <ol className="cq-list">
        {draft.items.map((item, index) => {
          const issue = problems[index];
          const touched = item.q || item.a || item.w.some(Boolean);
          return (
            <li key={index} className="cq-card">
              <div className="cq-card-head">
                <b>{t("Spørgsmål {n}", { n: index + 1 })}</b>
                {issue.length === 0 ? (
                  <span className="ok">
                    <Check aria-hidden="true" /> {t("Klar")}
                  </span>
                ) : (
                  touched && (
                    <span className="warn">
                      {issue.includes("duplicate")
                        ? t("Svarene må ikke være ens")
                        : issue.includes("prompt")
                          ? t("Skriv et spørgsmål")
                          : issue.includes("answer")
                            ? t("Skriv det rigtige svar")
                            : t("Skriv mindst ét forkert svar")}
                    </span>
                  )
                )}
                {draft.items.length > 1 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t("Fjern spørgsmål {n}", { n: index + 1 })}
                    onClick={() => {
                      setLink("");
                      setDraft({
                        ...draft,
                        items: draft.items.filter((_, i) => i !== index),
                      });
                    }}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
              <Textarea
                value={item.q}
                maxLength={CUSTOM_PROMPT_MAX}
                rows={2}
                aria-label={t("Spørgsmål {n}", { n: index + 1 })}
                placeholder={t("Fx Hvad hedder Mettes hund?")}
                onChange={(event) => update(index, { q: event.target.value })}
              />
              <Input
                className="cq-right"
                value={item.a}
                maxLength={CUSTOM_OPTION_MAX}
                aria-label={t("Rigtigt svar")}
                placeholder={t("Rigtigt svar")}
                onChange={(event) => update(index, { a: event.target.value })}
              />
              {item.w.map((wrong, wrongIndex) => (
                <Input
                  key={wrongIndex}
                  value={wrong}
                  maxLength={CUSTOM_OPTION_MAX}
                  aria-label={t("Forkert svar {n}", { n: wrongIndex + 1 })}
                  placeholder={
                    wrongIndex === 0
                      ? t("Forkert svar")
                      : t("Forkert svar (valgfrit)")
                  }
                  onChange={(event) =>
                    update(index, {
                      w: item.w.map((value, i) =>
                        i === wrongIndex ? event.target.value : value,
                      ),
                    })
                  }
                />
              ))}
              <Input
                value={item.e}
                maxLength={CUSTOM_EXPLANATION_MAX}
                aria-label={t("Forklaring (valgfri)")}
                placeholder={t("Forklaring, der vises bagefter (valgfri)")}
                onChange={(event) => update(index, { e: event.target.value })}
              />
            </li>
          );
        })}
      </ol>

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={draft.items.length >= CUSTOM_MAX_QUESTIONS}
        onClick={() => {
          setLink("");
          setDraft({ ...draft, items: [...draft.items, blankItem()] });
        }}
      >
        <Plus aria-hidden="true" />
        {t("Tilføj spørgsmål")} ({draft.items.length}/{CUSTOM_MAX_QUESTIONS})
      </Button>

      <section className="cq-actions">
        <p aria-live="polite">
          {readyCount === draft.items.length
            ? t("{n} spørgsmål er klar", { n: readyCount })
            : t("{ready} af {total} spørgsmål er klar", {
                ready: readyCount,
                total: draft.items.length,
              })}
        </p>
        <PlayerStepper value={players} onChange={setPlayers} />
        <Button
          size="lg"
          className="h-14 w-full text-base"
          disabled={!quiz}
          onClick={() => quiz && onPlay(quiz, players)}
        >
          <Play aria-hidden="true" />
          {t("Spil quizzen nu")}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-14 w-full text-base"
          disabled={!quiz}
          onClick={() => void makeLink()}
        >
          {typeof navigator !== "undefined" && "share" in navigator ? (
            <Share2 aria-hidden="true" />
          ) : (
            <Link2 aria-hidden="true" />
          )}
          {copied ? t("Link kopieret") : t("Del som link")}
        </Button>
        {link && (
          <div className="cq-link">
            <Input
              readOnly
              value={link}
              aria-label={t("Link til quizzen")}
              onFocus={(event) => event.currentTarget.select()}
            />
            {link.length > CUSTOM_LINK_SOFT_LIMIT && (
              <small>
                {t(
                  "Linket er langt. Nogle beskedtjenester klipper det over – prøv færre spørgsmål.",
                )}
              </small>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            setLink("");
            setDraft(blankDraft());
          }}
        >
          {t("Start forfra")}
        </Button>
      </section>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Invitation: en quiz, nogen har sendt et link til
// ════════════════════════════════════════════════════════════
export function CustomQuizInvite({
  quiz,
  onPlay,
  onBack,
}: {
  quiz: CustomQuiz;
  onPlay: (quiz: CustomQuiz, players: number) => void;
  onBack: () => void;
}) {
  const [players, setPlayers] = useState(1);
  return (
    <div className="cq mx-auto max-w-md text-center">
      <span className="cq-badge" aria-hidden="true">
        🎁
      </span>
      <h1 className="text-3xl font-black">
        {quiz.title || t("En quiz til dig")}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {t("Nogen har lavet en quiz med {n} spørgsmål til dig.", {
          n: quiz.items.length,
        })}
      </p>
      <div className="cq-actions">
        <PlayerStepper value={players} onChange={setPlayers} />
        <Button
          size="lg"
          className="h-14 w-full text-base"
          onClick={() => onPlay(quiz, players)}
        >
          <Play aria-hidden="true" />
          {t("Spil quizzen")}
        </Button>
        <Button variant="ghost" className="w-full" onClick={onBack}>
          {t("Til forsiden")}
        </Button>
      </div>
    </div>
  );
}
