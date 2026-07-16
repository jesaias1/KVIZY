"use client";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCheck,
  Download,
  Flag,
  Search,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { MessageResponse } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SEED_QUESTIONS } from "@/data/questions";
import { CATEGORIES, categoryById } from "@/lib/categories";
import type { Question, QuestionType } from "@/lib/types";
import { auditQuestion } from "@/lib/question-quality";

type ServerReport = {
  id: string;
  questionId: string;
  reason: string;
  createdAt: string;
};
const reportLabels: Record<string, string> = {
  wrong_answer: "Forkert svar",
  unclear: "Uklart spørgsmål",
  difficulty: "Forkert niveau",
  bad_options: "Dårlige svarmuligheder",
  outdated: "Forældet information",
};
export function AdminDashboard() {
  const [search, setSearch] = useState(""),
    [cat, setCat] = useState("all"),
    [generated, setGenerated] = useState<Question[]>([]),
    [managed, setManaged] = useState<Question[]>(SEED_QUESTIONS),
    [reports, setReports] = useState<ServerReport[]>([]),
    [editing, setEditing] = useState<Question | null>(null),
    [reviewOnly, setReviewOnly] = useState(false),
    [databaseReady, setDatabaseReady] = useState(false),
    [saving, setSaving] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/reports", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { reports: [] }))
      .then((data) => setReports(data.reports ?? []))
      .catch((fetchError) => {
        if (fetchError.name !== "AbortError") setReports([]);
      });
    fetch("/api/admin/questions", { signal: controller.signal })
      .then((response) =>
        response.ok ? response.json() : { questions: [], databaseReady: false },
      )
      .then((data) => {
        setDatabaseReady(Boolean(data.databaseReady));
        if (Array.isArray(data.questions) && data.questions.length > 0)
          setManaged(data.questions);
      })
      .catch(() => setDatabaseReady(false));
    return () => controller.abort();
  }, []);
  const flaggedQuestions = useMemo(
    () => managed.filter((question) => auditQuestion(question).length),
    [managed],
  );
  const rows = useMemo(
    () =>
      [...generated, ...managed].filter(
        (q) =>
          (cat === "all" || q.categoryId === cat) &&
          (!reviewOnly || auditQuestion(q).length > 0) &&
          q.prompt
            .toLocaleLowerCase("da")
            .includes(search.toLocaleLowerCase("da")),
      ),
    [cat, generated, managed, reviewOnly, search],
  );
  const generate = async () => {
    setBusy(true);
    setError("");
    const c = cat === "all" ? CATEGORIES[0] : categoryById(cat)!;
    const r = await fetch("/api/admin/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        categoryId: c.id,
        categoryName: c.name,
        difficulty: 3,
        count: 3,
        type: "multiple_choice" satisfies QuestionType,
      }),
    });
    const j = await r.json();
    if (!r.ok) setError(j.error);
    else setGenerated(j.accepted);
    setBusy(false);
  };
  const download = () => {
    const b = new Blob([JSON.stringify([...generated, ...managed], null, 2)], {
        type: "application/json",
      }),
      a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = "kvizy-spoergsmaal.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const downloadReports = () => {
    const data = reports.map((report) => {
      const question = SEED_QUESTIONS.find(
        (item) => item.id === report.questionId,
      );
      return {
        ...report,
        prompt: question?.prompt,
        options: question?.options,
        correctOptionId: question?.correctOptionId,
        explanation: question?.explanation,
      };
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = "kvizy-rapporter.json";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };
  const updateQuestion = async (
    question: Question,
    changes: Partial<Question>,
  ) => {
    if (!databaseReady) {
      setError("Kobl databasen til og kør migration/seed før redigering.");
      return false;
    }
    setSaving(true);
    setError("");
    const response = await fetch(
      `/api/admin/questions/${encodeURIComponent(question.id)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(changes),
      },
    );
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(result.error ?? "Ændringen kunne ikke gemmes.");
      return false;
    }
    setManaged((current) =>
      current.map((item) =>
        item.id === question.id
          ? { ...item, ...changes, updatedAt: new Date().toISOString() }
          : item,
      ),
    );
    return true;
  };
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge>Beskyttet</Badge>
          <h1 className="mt-2 text-3xl font-black">Spørgsmålsadministration</h1>
          <p className="text-muted-foreground">
            {managed.filter((question) => question.status === "active").length}{" "}
            aktive · {CATEGORIES.length} kategorier · {generated.length} i
            preview
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Database: {databaseReady ? "forbundet" : "offline-fallback"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={download}>
            <Download />
            Eksportér JSON
          </Button>
          <Button onClick={generate} disabled={busy}>
            <Sparkles />
            {busy ? "Genererer…" : "Generér AI-batch"}
          </Button>
        </div>
      </div>
      {error && (
        <Card className="mb-5 border-destructive">
          <CardContent className="p-4 text-destructive">{error}</CardContent>
        </Card>
      )}{" "}
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <TriangleAlert className="text-amber-500" />
            <div>
              <b>{flaggedQuestions.length} spørgsmål bør gennemgås</b>
              <p className="text-sm text-muted-foreground">
                Automatisk kontrol af fakta, kilder og svarmønstre
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <Flag className="text-primary" />
            <div>
              <b>{reports.length} spillerrapporter</b>
              <p className="text-sm text-muted-foreground">
                Seneste rapporter fra den centrale database
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      {reports.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Alle spillerrapporter</CardTitle>
              <Button size="sm" variant="outline" onClick={downloadReports}>
                <Download />
                Eksportér rapporter
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            {reports.map((report) => {
              const question = SEED_QUESTIONS.find(
                (item) => item.id === report.questionId,
              );
              const [reason, ...noteParts] = report.reason.split(":");
              return (
                <div key={report.id} className="rounded-xl border p-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="destructive">
                      {reportLabels[reason] ?? "Andet problem"}
                    </Badge>
                    <small className="text-muted-foreground">
                      {new Date(report.createdAt).toLocaleDateString("da-DK")}
                    </small>
                  </div>
                  <p className="mt-2 font-medium">
                    {question?.prompt ?? report.questionId}
                  </p>
                  {noteParts.length > 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {noteParts.join(":")}
                    </p>
                  )}
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const response = await fetch(
                        `/api/admin/reports/${encodeURIComponent(report.id)}`,
                        { method: "DELETE" },
                      );
                      if (response.ok)
                        setReports((current) =>
                          current.filter((item) => item.id !== report.id),
                        );
                    }}
                  >
                    <CheckCheck />
                    Markér behandlet
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
      {generated.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>AI-preview · ikke aktiveret</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {generated.map((q) => (
              <div key={q.id} className="rounded-xl border p-4">
                <MessageResponse>{`### ${q.prompt}\n\n${q.explanation}`}</MessageResponse>
                <Badge className="mt-3" variant="secondary">
                  Kvalitet {q.qualityScore}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {editing && (
        <Card className="mb-6 border-primary/40">
          <CardHeader>
            <CardTitle>Redigér spørgsmål</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Textarea
              value={editing.prompt}
              onChange={(event) =>
                setEditing({ ...editing, prompt: event.target.value })
              }
            />
            <Textarea
              value={editing.explanation}
              placeholder="Forklaring eller interessant fakta"
              onChange={(event) =>
                setEditing({ ...editing, explanation: event.target.value })
              }
            />
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={String(editing.difficulty)}
                onValueChange={(value) =>
                  setEditing({ ...editing, difficulty: Number(value) })
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <SelectItem key={level} value={String(level)}>
                      Niveau {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                disabled={saving}
                onClick={async () => {
                  const original = managed.find(
                    (item) => item.id === editing.id,
                  );
                  if (
                    original &&
                    (await updateQuestion(original, {
                      prompt: editing.prompt,
                      explanation: editing.explanation,
                      difficulty: editing.difficulty,
                    }))
                  )
                    setEditing(null);
                }}
              >
                {saving ? "Gemmer…" : "Gem ændringer"}
              </Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Annullér
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_260px]">
        <div className="relative">
          <Search className="absolute left-3 top-3 size-5 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Søg i spørgsmål"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle kategorier</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        className="mb-4"
        variant={reviewOnly ? "default" : "outline"}
        onClick={() => setReviewOnly((value) => !value)}
      >
        <TriangleAlert />
        {reviewOnly ? "Viser kvalitetskø" : "Vis kun kvalitetskø"}
      </Button>
      <div className="grid gap-3">
        {rows.slice(0, 100).map((q) => (
          <Card key={q.id}>
            <CardContent className="grid gap-2 p-4 sm:grid-cols-[1fr_auto]">
              <div>
                <div className="flex gap-2">
                  <Badge variant="outline">Niveau {q.difficulty}</Badge>
                  <Badge variant="secondary">{q.origin}</Badge>
                  {auditQuestion(q).length > 0 && (
                    <Badge variant="destructive">
                      {auditQuestion(q).length} advarsler
                    </Badge>
                  )}
                </div>
                <h2 className="mt-2 font-bold">{q.prompt}</h2>
                <p className="text-sm text-muted-foreground">
                  {categoryById(q.categoryId)?.name} · kvalitet {q.qualityScore}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(q)}
                >
                  Redigér
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={saving}
                  onClick={() =>
                    updateQuestion(q, {
                      status: q.status === "active" ? "disabled" : "active",
                    })
                  }
                >
                  {q.status === "active" ? "Deaktivér" : "Aktivér"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
