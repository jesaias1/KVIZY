import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privatliv – KVIZY",
  description:
    "Sådan behandler KVIZY dine data: ingen login, ingen cookies til sporing og ingen reklamer.",
  alternates: { canonical: "/privatliv" },
};

const sections: { title: string; body: string[] }[] = [
  {
    title: "Kort fortalt",
    body: [
      "KVIZY kræver ingen login og viser ingen reklamer. Vi bruger ingen sporingscookies og deler ingen data med reklamenetværk.",
    ],
  },
  {
    title: "Det, der bliver på din enhed",
    body: [
      "Spillernes navne, indstillinger, igangværende spil, historik, statistik og hvilke spørgsmål I har set gemmes kun i din browsers lokale lager. Det forlader ikke din enhed, medmindre du selv opretter en backup. Du kan til enhver tid slette det ved at rydde websitedata i din browser.",
    ],
  },
  {
    title: "Anonym brugsstatistik",
    body: [
      "Når et spil starter eller slutter, tæller vi anonymt, hvor mange spil der er spillet, og hvilke kategorier der er valgt. Tallene gemmes som samlede dagstællere uden IP-adresse, navn eller andre oplysninger, der kan føre tilbage til dig.",
    ],
  },
  {
    title: "Rapporter om spørgsmål",
    body: [
      "Hvis du trykker på «Er der noget galt?», sendes spørgsmålets id, den valgte årsag og en eventuel kort kommentar til os, så vi kan rette fejl. Skriv ikke personoplysninger i kommentaren.",
    ],
  },
  {
    title: "Rum (spil på flere telefoner)",
    body: [
      "Et rum forbinder spillernes telefoner direkte med værtens enhed. Værten kan se navnene og dyrene, spillerne vælger, og de svar, de giver. Intet af det gemmes hos os, og rummet findes kun, så længe værten har siden åben.",
      "For at enhederne kan finde hinanden bruger vi den gratis mødeserver PeerJS (0.peerjs.com). Den kan se rumkoden og enhedernes IP-adresser, men hverken navne eller svar. I en direkte forbindelse kan enhederne teknisk set se hinandens IP-adresser, som i de fleste andre onlinespil og videoopkald. Kan to enheder ikke nå hinanden direkte, kan den krypterede trafik i stedet gå via en gratis relæserver (openrelay.metered.ca).",
    ],
  },
  {
    title: "Backup af seneste spørgsmål",
    body: [
      "Hvis du opretter en backup, gemmer vi listen over sete spørgsmål og jeres seneste opsætning, herunder de navne, I har skrevet, under en tilfældig kode. Koden udløber efter ét år. Har du ikke koden, kan ingen hente backuppen.",
    ],
  },
  {
    title: "Teknik og hosting",
    body: [
      "Siden hostes hos Vercel, som som alle webhoteller kan se tekniske oplysninger som IP-adresse i serverlogs i kort tid. Vi bruger dem ikke til andet.",
    ],
  },
  {
    title: "Spørgsmål",
    body: [
      "Vil du have noget slettet, eller har du spørgsmål til dine data, kan du kontakte ejeren af KVIZY via projektets side på GitHub: github.com/jesaias1/KVIZY.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        ← Tilbage til KVIZY
      </Link>
      <h1 className="mt-4 text-4xl font-black tracking-tight">Privatliv</h1>
      <p className="mt-2 text-muted-foreground">
        Sidst opdateret oktober 2026.
      </p>
      {sections.map((section) => (
        <section key={section.title} className="mt-8">
          <h2 className="text-xl font-bold">{section.title}</h2>
          {section.body.map((text) => (
            <p
              key={text}
              className="mt-2 leading-relaxed text-muted-foreground"
            >
              {text}
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}
