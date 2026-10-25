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
  await page.getByRole("button", { name: /Fortsæt dit spil/ }).click();
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
  await expect(
    page.getByRole("button", { name: /Kun forkerte/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tilbage" }).click();
  await page.getByRole("button", { name: /Til forsiden/ }).click();
  const done = page.getByRole("button", { name: /Dagens quiz.*Klaret/ });
  await expect(done).toBeVisible();
  await expect(done).toBeDisabled();
});
test("statistik vises efter et spil og kan starte træning", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Hurtigt spil/ }).click();
  for (let i = 0; i < 10; i++) await answerAndContinue(page);
  await page.getByRole("button", { name: /Til forsiden/ }).click();
  await page.getByRole("button", { name: "Åbn menu" }).click();
  await page.getByRole("button", { name: "Statistik" }).click();
  await expect(page.getByRole("heading", { name: "Statistik" })).toBeVisible();
  await expect(page.getByText("Efter kategori")).toBeVisible();
  await expect(page.getByText("længste stime")).toBeVisible();
  await expect(page.getByText(/Præstationer/)).toBeVisible();
  await expect(page.getByText("Første runde")).toBeVisible();
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

test("læs-op-tilstand skjuler svarene, til værten viser dem", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Åbn menu" }).click();
  await page.getByRole("button", { name: "Indstillinger" }).click();
  await page.getByRole("switch", { name: /Læs-op/ }).click();
  await page.getByRole("button", { name: "Tilbage" }).click();
  await page.getByRole("button", { name: /Hurtigt spil/ }).click();
  await expect(page.getByText(/Spørgsmål 1 af 10/)).toBeVisible();
  await expect(page.locator(".answer-button")).toHaveCount(0);
  await page.getByRole("button", { name: "Vis svarmuligheder" }).click();
  await expect(page.locator(".answer-button").first()).toBeVisible();
});

test("lynrunde går videre af sig selv og slutter, når tiden er gået", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: /Lynrunde/ }).click();
  await expect(page.getByRole("timer")).toBeVisible();
  await page.locator(".answer-button").first().click();
  await page.clock.runFor(1_000);
  await expect(
    page.locator(".answer-button.correct, .answer-button.wrong"),
  ).toHaveCount(0);
  await page.clock.fastForward(62_000);
  await expect(page.getByRole("button", { name: /Spil igen/ })).toBeVisible();
});

test("privatlivssiden findes og kan nås fra forsiden", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Privatliv/ }).click();
  await expect(page.getByRole("heading", { name: "Privatliv" })).toBeVisible();
});

test("rum: en telefon kan joine værten og svare på et spørgsmål", async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Kører kun én gang.");
  test.setTimeout(120_000);
  const reachable = await fetch("https://0.peerjs.com/")
    .then((r) => r.ok)
    .catch(() => false);
  test.skip(!reachable, "Mødeserveren kan ikke nås fra denne maskine.");
  const hostPage = await (await browser.newContext()).newPage();
  const phone = await (await browser.newContext()).newPage();
  await hostPage.goto("/");
  await hostPage.getByRole("button", { name: /Opret rum/ }).click();
  await hostPage.waitForSelector(".room-code span", { timeout: 30_000 });
  const code = (
    await hostPage.locator(".room-code span").allTextContents()
  ).join("");
  // En ekstra skærm (TV) viser det samme som værten, men kan ikke svare.
  const tv = await (await browser.newContext()).newPage();
  await tv.goto(`/?skaerm=${code}`);
  await expect(tv.locator(".room-code span").first()).toBeVisible({
    timeout: 30_000,
  });
  await phone.goto(`/?rum=${code}`);
  await phone.getByPlaceholder("Fx Mette").fill("Mette");
  await phone.getByRole("button", { name: /^Join/ }).click();
  await expect(phone.getByText(/Du er med/)).toBeVisible({ timeout: 30_000 });
  await expect(hostPage.getByText(/1 spiller med/).first()).toBeVisible();
  await hostPage.getByRole("button", { name: /Start quizzen/ }).click();
  await expect(tv.locator(".room-tile").first()).toBeVisible({
    timeout: 15_000,
  });
  await phone.locator(".room-tile").first().click();
  await expect(
    hostPage.getByRole("button", { name: /Næste spørgsmål/ }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(phone.getByText(/Du er nr\./)).toBeVisible();
});

test("sproget kan skiftes til engelsk og huskes, men ikke midt i et spil", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to English" }).click();
  await expect(page.getByRole("heading", { name: /Quiz night/ })).toBeVisible();
  // Før et spil kan sproget skiftes frit tilbage og frem.
  await page.getByRole("button", { name: "Skift til dansk" }).click();
  await expect(
    page.getByRole("heading", { name: /Quiz-aftenen/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Switch to English" }).click();
  await page.getByRole("button", { name: /Quick game/ }).click();
  await expect(page.getByText(/Question 1 of 10/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Skift til dansk" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: /Quiz night/ })).toBeVisible();
  // Midt i et spil er sprogvalget skjult.
  await expect(
    page.getByRole("button", { name: "Skift til dansk" }),
  ).toHaveCount(0);
});

test("egen quiz: lav den, del den som link og spil den", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Lav din egen quiz" }).click();
  await page.getByLabel("Navn på quizzen").fill("Mettes fødselsdag");
  await page.getByLabel("Spørgsmål 1").fill("Hvad hedder Mettes hund?");
  await page.getByLabel("Rigtigt svar").fill("Bjørn");
  await page.getByLabel("Forkert svar 1").fill("Fido");
  await page.getByRole("button", { name: "Del som link" }).click();
  const link = await page.getByLabel("Link til quizzen").inputValue();
  expect(link).toContain("#quiz=");
  // Linket åbner en invitation, som kan spilles til ende.
  await page.goto("/");
  await page.goto(link);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Mettes fødselsdag" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Spil quizzen" }).click();
  await expect(page.getByText("Hvad hedder Mettes hund?")).toBeVisible();
  await answerAndContinue(page);
  await expect(
    page.getByText(/vinder!|deler sejren!|af 1/i).first(),
  ).toBeVisible();
});
