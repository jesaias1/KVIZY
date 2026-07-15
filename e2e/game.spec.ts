import { test, expect } from "@playwright/test";
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
  await page.getByPlaceholder("Søg i 53 kategorier").fill("Danmark");
  await page.getByRole("button", { name: /Fortsæt/ }).click();
  await page.getByLabel("Brugerdefineret antal").fill("3");
  await page.getByRole("button", { name: /Start quizzen/ }).click();
  await expect(page.getByText(/Spørgsmål 1 af 3/)).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /Fortsæt spil/ }).click();
  await expect(page.getByText(/Spørgsmål 1 af 3/)).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await page.locator(".answer-button").first().click();
    await page.getByRole("button", { name: /Videre/ }).click();
  }
  await expect(page.getByText(/vinder!/i)).toBeVisible();
  await page.getByRole("button", { name: /Revanche/ }).click();
  await expect(page.getByText(/Spørgsmål 1 af 3/)).toBeVisible();
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
