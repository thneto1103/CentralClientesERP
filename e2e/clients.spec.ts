import { expect, test } from "@playwright/test";

test("lista as quatro lojas com o status inicial", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("client-card")).toHaveCount(4);
  await expect(page.getByRole("button", { name: /Mix Parfum/ })).toContainText("Homologação");
  await expect(page.getByRole("button", { name: /Hara Perfumes/ })).toContainText("Em produção");
  await expect(page.getByRole("button", { name: /Tabacaju/ })).toContainText("Em andamento");
  await expect(page.getByRole("button", { name: /ELO/ })).toContainText("Não iniciado");
});

test("muda o status da ELO e mantém depois de recarregar", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("client-card").filter({ hasText: "ELO" }).click();
  await page.getByTestId("status-em_andamento").click();
  await expect(page.getByRole("heading", { name: "ELO" })).toBeVisible();
  await expect(page.getByTestId("edit-notes")).toHaveValue(/Ainda não implantado/);
  await expect(page.getByText("Status: Não iniciado → Em andamento")).toBeVisible();
  await page.reload();
  await page.getByTestId("client-card").filter({ hasText: "ELO" }).click();
  await expect(page.getByTestId("status-em_andamento")).toHaveAttribute("aria-checked", "true");
});

test("marca a instalação da Hara sem apagar as outras lojas", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("client-card").filter({ hasText: "Hara Perfumes" }).click();
  await page.getByTestId("check-instalado").click();
  await expect(page.getByText("Instalador na loja: feito")).toBeVisible();
  await expect(page.getByTestId("client-card")).toHaveCount(4);
});

test("cria um cliente e edita a nota da Mix Parfum", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("new-client").click();
  await page.getByTestId("new-name").fill("Loja Nova");
  await page.getByTestId("new-repo").fill("ERPOnlyPy-Nova");
  await page.getByTestId("create-client").click();
  await expect(page.getByRole("heading", { name: "Loja Nova" })).toBeVisible();

  await page.getByTestId("client-card").filter({ hasText: "Mix Parfum" }).click();
  await page.getByTestId("edit-notes").fill("Nota editada da Mix");
  await page.getByTestId("edit-notes").blur();
  await page.reload();
  await page.getByTestId("client-card").filter({ hasText: "Loja Nova" }).click();
  await expect(page.getByRole("heading", { name: "Loja Nova" })).toBeVisible();
  await page.getByTestId("client-card").filter({ hasText: "Mix Parfum" }).click();
  await expect(page.getByTestId("edit-notes")).toHaveValue("Nota editada da Mix");
});

test("marca entrega e pagamento na agenda", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("nav-agenda").click();
  await page.getByTestId("date-client").selectOption({ label: "ELO" });
  await page.getByTestId("date-kind").selectOption("entrega");
  await page.getByTestId("date-day").fill("2026-10-20");
  await page.getByTestId("date-note").fill("Levar instalador");
  await page.getByTestId("save-date").click();
  await expect(page.getByText("Entrega · ELO")).toBeVisible();

  await page.getByTestId("date-kind").selectOption("pagamento");
  await page.getByTestId("date-client").selectOption({ label: "Hara Perfumes" });
  await page.getByTestId("date-day").fill("2026-10-28");
  await page.getByTestId("date-amount").fill("150,00");
  await page.getByTestId("save-date").click();
  await expect(page.getByText(/Pagamento · Hara Perfumes · R\$\s?150,00/)).toBeVisible();
  await page.reload();
  await page.getByTestId("nav-agenda").click();
  await expect(page.getByText("Entrega · ELO")).toBeVisible();
});

test("libera o instalador só depois do banco preenchido", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("new-client").click();
  await page.getByTestId("new-name").fill("Loja Gerada");
  await page.getByTestId("create-client").click();
  await expect(page.getByTestId("deploy-gerar")).toBeDisabled();
  await page.getByTestId("edit-host").fill("db.exemplo.supabase.co");
  await page.getByTestId("edit-host").blur();
  await page.getByTestId("db-user").fill("postgres.exemplo");
  await page.getByTestId("db-user").blur();
  await page.getByTestId("db-port").fill("5432");
  await page.getByTestId("db-port").blur();
  await page.getByTestId("db-name").fill("postgres");
  await page.getByTestId("db-name").blur();
  await expect(page.getByTestId("deploy-gerar")).toBeDisabled();
  await page.getByTestId("secret-supabase-banco").fill("senha-de-teste");
  await page.getByTestId("secret-supabase-banco").blur();
  await expect(page.getByTestId("deploy-gerar")).toBeEnabled();
  await expect(page.getByTestId("deploy-gerar")).toHaveText("Gerar instalador");
  await expect(page.getByTestId("deploy-path")).toContainText("loja-gerada");
});

test("mostra o banco e o SMTP que já estão no .env, sem gravar um token novo", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("client-card").filter({ hasText: "Mix Parfum" }).click();
  await expect(page.getByTestId("db-user")).not.toHaveValue("");
  await expect(page.getByTestId("smtp-host")).not.toHaveValue("");
  const length = await page.getByTestId("secret-focus-homolog").evaluate((element) => (element as HTMLInputElement).value.length);
  expect(length).toBeGreaterThan(0);
  await page.getByTestId("client-card").filter({ hasText: "Tabacaju" }).click();
  await expect(page.getByTestId("smtp-host")).toHaveValue("");
  const stored = await page.evaluate(() => localStorage.getItem("central-clientes.v1"));
  expect(stored ?? "").not.toContain("TOKEN-SECRETO-XYZ");
});
