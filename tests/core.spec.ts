import { expect, test, type Page } from "@playwright/test";

const EXPECTED_FILES: RegExp[] = [
  /\/pyodide-lock.json$/,
  /\/pyodide.asm.wasm$/,
  /\/python_stdlib.zip$/,
  /\/pygame_ce-.*\.whl$/,
];

test("loads runtime", async ({ page }) => {
  await page.goto("/");

  // Expect the "Loading Python..." message and buttons to be disabled
  await expect(page.getByText("Loading Python...")).toBeVisible();

  for (const button of await page.getByRole("button").all()) {
    await expect(button).toBeDisabled();
  }

  // Expect the "Loading Python..." message to vanish and buttons to enable
  await expect(page.getByText("Loading Python...")).toBeHidden({
    timeout: 60_000, // Loading may take a while depending on network
  });

  for (const button of await page.getByRole("button").all()) {
    await expect(button).toBeEnabled();
  }

  // Expect the necessary runtime files were fetched
  const requests = await page.requests();

  for (const pattern of EXPECTED_FILES) {
    expect(
      requests.some((request) => pattern.test(request.url())),
      `Expect request matching ${pattern}`,
    ).toBeTruthy();
  }
});

test.describe("core", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto("/");

    await expect(page.getByText("Loading Python...")).toBeHidden({
      timeout: 60_000, // Loading may take a while depending on network
    });
  });

  test("template runs", async () => {
    // Start the project
    const startButton = page.getByRole("button", { name: "Run it!" });
    await startButton.click();

    // Check the pygame-ce message is printed
    const outputPanel = page.getByRole("tabpanel", { name: "Output" });
    await expect(outputPanel).toContainText(
      /pygame-ce [\d.]+ \(SDL [\d.]+, Python [\d.]+\)/,
    );

    // Restart the project
    await page.getByRole("button", { name: "Stop" }).click();
    await startButton.click();

    // Check the console was cleared
    await expect(outputPanel).toContainText(/^$/);
  });

  test("edits affect execution", async () => {
    // Edit the file
    const editor = page.getByRole("textbox");
    await editor.fill('print("hi")');

    // Start the project
    const startButton = page.getByRole("button", { name: "Run it!" });
    await startButton.click();

    // Check the pygame-ce message is printed
    const outputPanel = page.getByRole("tabpanel", { name: "Output" });
    await expect(outputPanel).toContainText("hi");
  });

  test("edits persist across reloads", async ({ browserName }) => {
    // FIXME: Webkit seems to raise a COEP error on reload when served by Vite
    test.skip(browserName === "webkit", "Reload fails due to COEP");

    const marker = "# Persistence test";

    // Edit the file
    const editor = page.getByRole("textbox");
    await editor.fill(marker);

    // Reload the page
    await page.reload();
    await expect(page.getByText("Loading Python...")).toBeHidden({
      timeout: 60_000, // Loading may take a while depending on network
    });

    // Assert content remained the same
    await expect(editor).toContainText(marker);
  });
});
