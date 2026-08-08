import { expect, test, type Page } from "@playwright/test";
import { Runtime } from "./helpers";

const EXPECTED_FILES: RegExp[] = [
  /\/pyodide-lock.json$/,
  /\/pyodide.asm.wasm$/,
  /\/python_stdlib.zip$/,
  /\/pygame_ce-.*\.whl$/,
];

test("loads runtime", async ({ page }) => {
  const runtime = new Runtime(page);
  await page.goto("/");

  // Expect the "Loading Python..." message and buttons to be disabled
  await expect(page.getByText("Loading Python...")).toBeVisible();

  for (const button of await page.getByRole("button").all()) {
    await expect(button).toBeDisabled();
  }

  await runtime.waitForLoad();

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
  let runtime: Runtime;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    runtime = new Runtime(page);
    await runtime.loadEditor();
  });

  test("template runs", async () => {
    // Start the project
    await runtime.start();

    // Check the pygame-ce message is printed
    const outputPanel = page.getByRole("tabpanel", { name: "Output" });
    await expect(outputPanel).toContainText(
      /pygame-ce [\d.]+ \(SDL [\d.]+, Python [\d.]+\)/,
    );

    // Restart the project
    await runtime.stop();
    await runtime.start();

    // Check the console was cleared
    await expect(outputPanel).toContainText(/^$/);
  });

  test("edits affect execution", async () => {
    // Edit the file
    const editor = page.getByRole("textbox");
    await editor.fill('print("hi")');

    // Start the project
    await runtime.start();

    // Check the message is printed
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
    await runtime.loadEditor();

    // Assert content remained the same
    await expect(editor).toContainText(marker);
  });

  test("sync error is handled", async () => {
    // Edit the file to raise an error
    const editor = page.getByRole("textbox");
    await editor.fill('raise RuntimeError("sync test")');

    // Start the project
    await runtime.start();

    // Check the error is printed
    const errorPanel = page.getByRole("tabpanel", { name: "Errors" });
    await expect(errorPanel).toBeVisible();
    await expect(errorPanel).toContainText(
      "Traceback (most recent call last):",
    );
    await expect(errorPanel).toContainText("RuntimeError: sync test");

    // Fix the error
    await editor.fill('print("sync error fixed")');

    // Run the fixed project
    await runtime.start();

    // Check the panel swaps back and prints
    const outputPanel = page.getByRole("tabpanel", { name: "Output" });
    await expect(outputPanel).toBeVisible();
    await expect(outputPanel).toContainText("sync error fixed");
  });

  test("async error is handled", async () => {
    // Edit the file to raise an error
    const editor = page.getByRole("textbox");
    await editor.fill(
      [
        "async def main():",
        '    raise RuntimeError("async test")',
        "",
        "main()",
      ].join("\n"),
    );

    // Start the project
    await runtime.start();

    // Check the error is printed
    const errorPanel = page.getByRole("tabpanel", { name: "Errors" });
    await expect(errorPanel).toBeVisible();
    await expect(errorPanel).toContainText(
      "Traceback (most recent call last):",
    );
    await expect(errorPanel).toContainText("RuntimeError: async test");

    // Fix the error
    await editor.fill(
      [
        "async def main():",
        '    print("async error fixed")',
        "",
        "main()",
      ].join("\n"),
    );

    // Run the fixed project
    await runtime.start();

    // Check the panel swaps back and prints
    const outputPanel = page.getByRole("tabpanel", { name: "Output" });
    await expect(outputPanel).toBeVisible();
    await expect(outputPanel).toContainText("async error fixed");
  });
});
