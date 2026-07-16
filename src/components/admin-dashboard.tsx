"use client";
import { useEffect, useMemo, useState } from "react";
import { Download, Flag, Search, Sparkles, TriangleAlert } from "lucide-react";
import { MessageResponse } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    [reports, setReports] = useState<ServerReport[]>([]),
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
    return () => controller.abort();
  }, []);
  const flaggedQuestions = useMemo(
    () => SEED_QUESTIONS.filter((question) => auditQuestion(question).length),
    [],
  );
  const rows = useMemo(
    () =>
      [...generated, ...SEED_QUESTIONS].filter(
        (q) =>
          (cat === "all" || q.categoryId === cat) &&
          q.prompt
            .toLocaleLowerCase("da")
            .includes(search.toLocaleLowerCase("da")),
      ),
    [cat, generated, search],
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
    const b = new Blob(
        [JSON.stringify([...generated, ...SEED_QUESTIONS], null, 2)],
        { type: "application/json" },
      ),
      a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = "kvizy-spoergsmaal.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge>Beskyttet</Badge>
          <h1 className="mt-2 text-3xl font-black">Spørgsmålsadministration</h1>
          <p className="text-muted-foreground">
            {SEED_QUESTIONS.length} aktive · {CATEGORIES.length} kategorier ·{" "}
            {generated.length} i preview
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
            <CardTitle>Seneste spillerrapporter</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {reports.slice(0, 12).map((report) => {
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
                <Button size="sm" variant="outline">
                  Redigér
                </Button>
                <Button size="sm" variant="ghost">
                  Deaktivér
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
