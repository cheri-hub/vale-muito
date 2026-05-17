import { expect, test, type Page } from "@playwright/test";

const browserErrors = new WeakMap<Page, { consoleErrors: string[]; failedRequests: string[] }>();

test.beforeEach(async ({ page }) => {
  await watchForBrowserErrors(page);
});

test.afterEach(async ({ page }) => {
  const errors = browserErrors.get(page);

  expect(errors?.failedRequests ?? []).toEqual([]);
  expect(errors?.consoleErrors ?? []).toEqual([]);
});

test("home discovery loads recommendations, filters, and map", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Vale Muito/);
  await expect(page.getByRole("heading", { name: /Comidas que valem muito o dinheiro/i })).toBeVisible();
  await expect(page.getByText(/Curadoria aberta em Piracicaba\/SP/i)).toBeVisible();
  await expect(page.getByText(/5 achados que valem a pena/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Piracicaba\/SP/i })).toBeVisible();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.locator(".vale-muito-marker")).toHaveCount(5);

  await page.getByPlaceholder(/Buscar prato, lugar, bairro ou tag/i).fill("pudim");
  await expect(page.getByText(/1 achado que vale a pena/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /Pudim de queijo/i })).toBeVisible();

  await page.getByRole("button", { name: /Limpar filtros/i }).click();
  await expect(page.getByText(/5 achados que valem a pena/i)).toBeVisible();
});

test("recommendation detail page exposes value context and actions", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Ver por que vale muito/i }).first().click();

  await expect(page).toHaveURL(/\/recommendations\/rec-/);
  await expect(page.getByRole("heading", { name: /Por que vale muito/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Compartilhar/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Denunciar/i })).toBeVisible();
  await expect(page.getByText(/Pagou/i)).toBeVisible();
});

test("public guidelines show region, photo policy, and editorial rule", async ({ page, isMobile }) => {
  await page.goto("/guidelines");

  await expect(page.getByRole("heading", { name: /O que entra no Vale Muito/i })).toBeVisible();
  await expect(page.getByText(/Gastei para comer isso e valeu a pena/i).first()).toBeVisible();
  await expect(page.getByText(/Piracicaba\/SP/i)).toBeVisible();
  await expect(page.getByText(/Foto não é obrigatória/i)).toBeVisible();

  if (!isMobile) {
    await page.getByRole("link", { name: /Descobrir/i }).click();
    await expect(page).toHaveURL(/\/$/);
  }
});

test("new recommendation form makes photo optional and validates required value fields", async ({ page }) => {
  await page.goto("/recommend/new");

  await expect(page.getByText(/Nova recomendação em Piracicaba\/SP/i)).toBeVisible();
  await expect(page.getByText(/Gastei para comer isso e valeu a pena/i).first()).toBeVisible();
  await expect(page.getByText(/Foto \(opcional\)/i)).toBeVisible();
  await expect(page.locator(".leaflet-container")).toBeVisible();

  const photoInput = page.locator('input[name="photo"]');
  await expect(photoInput).not.toHaveAttribute("required", /.+/);
  await expect(page.locator('input[name="city"]')).toHaveValue("Piracicaba");

  await expect(page.getByRole("button", { name: /Publicar recomendação/i })).toBeDisabled();
});

test("HTTP redirects to HTTPS and security headers are present", async ({ request }) => {
  const httpResponse = await request.get("http://vale-muito.cherihub.cloud/", { maxRedirects: 0 });
  expect(httpResponse.status()).toBe(301);
  expect(httpResponse.headers().location).toMatch(/^https:\/\/vale-muito\.cherihub\.cloud\//);

  const httpsResponse = await request.get("/");
  expect(httpsResponse.status()).toBe(200);
  expect(httpsResponse.headers()["x-frame-options"]).toBe("DENY");
  expect(httpsResponse.headers()["x-content-type-options"]).toBe("nosniff");
  expect(httpsResponse.headers()["strict-transport-security"]).toContain("max-age=");
});

async function watchForBrowserErrors(page: Page) {
  const errors = { failedRequests: [] as string[], consoleErrors: [] as string[] };
  browserErrors.set(page, errors);

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.consoleErrors.push(message.text());
    }
  });

  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "unknown";
    const url = request.url();

    if (!url.includes("_rsc=") && !failure.includes("ERR_ABORTED")) {
      errors.failedRequests.push(`${request.method()} ${url} ${failure}`);
    }
  });
}
