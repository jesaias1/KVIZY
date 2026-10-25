import { locale } from "./i18n";

// Oplæsning med enhedens egen stemme. Intet sendes til en server.

export const canSpeak = () =>
  typeof window !== "undefined" && "speechSynthesis" in window;

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

export function speak(text: string) {
  if (!canSpeak() || !text.trim()) return;
  stopSpeaking();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale();
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

/** Spørgsmålet og svarmulighederne som en sætning, der er til at lytte til. */
export function questionSpeech(prompt: string, options: string[]) {
  const letters = ["A", "B", "C", "D", "E", "F"];
  return [
    prompt,
    ...options.map((option, index) => `${letters[index] ?? ""}: ${option}`),
  ].join(". ");
}
