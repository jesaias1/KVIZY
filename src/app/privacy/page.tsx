import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy – KVIZY",
  description:
    "How KVIZY handles your data: no login, no tracking cookies and no ads.",
  alternates: { canonical: "/privacy", languages: { da: "/privatliv" } },
};

const sections: { title: string; body: string[] }[] = [
  {
    title: "In short",
    body: [
      "KVIZY needs no login and shows no ads. We use no tracking cookies and share no data with advertising networks.",
    ],
  },
  {
    title: "What stays on your device",
    body: [
      "Player names, settings, games in progress, history, statistics and which questions you have seen are stored only in your browser's local storage. None of it leaves your device unless you create a backup yourself. You can delete it at any time by clearing the site data in your browser.",
    ],
  },
  {
    title: "Anonymous usage statistics",
    body: [
      "When a game starts or finishes, we anonymously count how many games have been played and which categories were chosen. The numbers are stored as daily totals with no IP address, name or other information that could lead back to you.",
    ],
  },
  {
    title: "Question reports",
    body: [
      "If you tap “Is something wrong?”, the question's ID, the reason you chose and any short comment are sent to us so we can fix mistakes. Please do not write personal information in the comment.",
    ],
  },
  {
    title: "Rooms (playing on several phones)",
    body: [
      "A room connects the players' phones directly to the host's device. The host can see the names and animals the players choose and the answers they give. None of it is stored by us, and the room exists only while the host keeps the page open.",
      "So that the devices can find each other, we use the free meeting server PeerJS (0.peerjs.com). It can see the room code and the devices' IP addresses, but neither names nor answers. In a direct connection the devices can technically see each other's IP addresses, as in most other online games and video calls. If two devices cannot reach each other directly, the encrypted traffic may instead go through a free relay server (openrelay.metered.ca).",
    ],
  },
  {
    title: "Backup of recent questions",
    body: [
      "If you create a backup, we store the list of questions you have seen and your most recent setup, including the names you typed, under a random code. The code expires after one year. Without the code, nobody can retrieve the backup.",
    ],
  },
  {
    title: "Technology and hosting",
    body: [
      "The site is hosted by Vercel, which, like any web host, can see technical information such as IP addresses in its server logs for a short time. We do not use it for anything else.",
    ],
  },
  {
    title: "Questions",
    body: [
      "If you want something deleted, or have questions about your data, you can contact the owner of KVIZY through the project's page on GitHub: github.com/jesaias1/KVIZY.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main lang="en" className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        ← Back to KVIZY
      </Link>
      <h1 className="mt-4 text-4xl font-black tracking-tight">Privacy</h1>
      <p className="mt-2 text-muted-foreground">Last updated October 2026.</p>
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
