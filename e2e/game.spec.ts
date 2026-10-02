import { test, expect, type Page } from "@playwright/test";

// Besvarer det aktuelle spørgsmål og går videre. Rækkefølge-spørgsmål kræver,
// at alle fire led vælges, før svaret kan låses.
async function answerAndContinue(page: Page) {
  const lock = page.getByRole("button", { name: "Lås rækkefølgen" });
  if (await lock.isVisible()) {
    const options = page.locator(".answer-button");
    for (let index = 0; index < (await options.count()); index++)
      await options.nth(index).click();
    await lock.click();
  } else {
    await page.locator(".answer-button").first().click();
  }
  await page.locator(".next-question-button").click();
}

test("start, spillere, kategorier, quiz, refresh, resultat og revanche", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Quiz-aftenen/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Start nyt spil/ }).click();
  await page.getByLabel("Navn på 1").fill("Anna");
  await page.getByRole("button", { name: /Fortsæt/ }).click();
  await page.getByPlaceholder("Søg i kategorier").fill("Danmark");
  await page.getByRole("button", { name: /Fortsæt/ }).click();
  await page.getByRole("button", { name: /Start quizzen/ }).click();
  await expect(page.getByText(/Spørgsmål 1 af 10/)).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /Fortsæt spil/ }).click();
  await expect(page.getByText(/Spørgsmål 1 af 10/)).toBeVisible();
  for (let i = 0; i < 10; i++) await answerAndContinue(page);
  await expect(page.getByText(/vinder!|deler sejren!/i)).toBeVisible();
  await page.getByRole("button", { name: /Revanche/ }).click();
  await expect(page.getByText(/Spørgsmål 1 af 10/)).toBeVisible();
});
test("hurtigt spil fra forsiden ender på et resultat med Spil igen", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Hurtigt spil/ }).click();
  await expect(page.getByText(/Spørgsmål 1 af 10/)).toBeVisible();
  for (let i = 0; i < 10; i++) await answerAndContinue(page);
  await expect(page.getByText(/af 10/).first()).toBeVisible();
  await page.getByRole("button", { name: /Spil igen/ }).click();
  await expect(page.getByText(/Spørgsmål 1 af 10/)).toBeVisible();
});
test("dagens quiz kan kun spilles én gang pr. dag og giver en stime", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Dagens quiz/ }).click();
  await expect(page.getByText(/Spørgsmål 1 af 10/)).toBeVisible();
  for (let i = 0; i < 10; i++) await answerAndContinue(page);
  await expect(page.getByText(/Dagens quiz/).first()).toBeVisible();
  await page.getByRole("button", { name: /Gennemgå svar/ }).click();
  await expect(page.getByRole("button", { name: /Kun forkerte/ })).toBeVisible();
  await page.getByRole("button", { name: "Tilbage" }).click();
  await page.getByRole("button", { name: /Til forsiden/ }).click();
  const done = page.getByRole("button", { name: /Dagens quiz klaret/ });
  await expect(done).toBeVisible();
  await expect(done).toBeDisabled();
});
test("statistik vises efter et spil og kan starte træning", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Hurtigt spil/ }).click();
  for (let i = 0; i < 10; i++) await answerAndContinue(page);
  await page.getByRole("button", { name: /Til forsiden/ }).click();
  await page.getByRole("button", { name: "Åbn menu" }).click();
  await page.getByRole("button", { name: "Statistik" }).click();
  await expect(page.getByRole("heading", { name: "Statistik" })).toBeVisible();
  await expect(page.getByText("Efter kategori")).toBeVisible();
  await expect(page.getByText("længste stime")).toBeVisible();
});
test("holdkamp giver holdnavne i stedet for spillernavne", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start nyt spil/ }).click();
  await page.getByRole("radio", { name: /Hold mod hold/ }).click();
  await expect(page.getByLabel("Navn på 1")).toHaveValue("Hold 1");
  await page.getByRole("radio", { name: /Alle mod alle/ }).click();
  await expect(page.getByLabel("Navn på 1")).toHaveValue("Spiller 1");
});
test("spillet kan starte offline efter det første besøg", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.getByRole("button", { name: /Hurtigt spil/ }).click();
  await expect(page.getByText(/Spørgsmål 1 af 10/)).toBeVisible();
  await page.reload();
  await context.setOffline(true);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Quiz-aftenen/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Hurtigt spil/ }).click();
  await expect(page.getByText(/Spørgsmål 1 af 10/)).toBeVisible();
});
test("tom kategori blokerer sikkert", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start nyt spil/ }).click();
  await page.getByRole("button", { name: /Fortsæt/ }).click();
  await page.getByRole("button", { name: "Fravælg alle" }).click();
  await expect(page.getByRole("button", { name: /Fortsæt/ })).toBeDisabled();
});
test("admin kræver hemmelighed", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByText("KVIZY administration")).toBeVisible();
  await expect(page.getByRole("button", { name: "Log ind" })).toBeVisible();
});
