import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { FileBrowser, Runtime, failOnErrors } from "./helpers";

const EXPECTED_FILES: RegExp[] = [
  /\/pyodide-lock.json$/,
  /\/pyodide.asm.wasm$/,
  /\/python_stdlib.zip$/,
  /\/pygame_ce-.*\.whl$/,
];

test("loads runtime", async ({ page }) => {
  failOnErrors(page);

  const runtime = new Runtime(page);
  await page.goto("/");

  const loadingPrompt = page.getByText("Loading Python...");
  const startButton = page.getByRole("button", { name: "Run it!" });

  // Expect the "Loading Python..." message and the start button to be disabled
  await expect(loadingPrompt).toBeVisible();
  await runtime.editorIsClosed();
  await startButton.isDisabled();

  await runtime.waitForLoad();

  // Expect the loading message to disappear and the start button to be enabled
  await expect(loadingPrompt).toBeHidden();
  await expect(page.getByText("No file open")).toBeHidden();
  await startButton.isEnabled();

  // Expect nothing to be running yet
  await runtime.isStopped();

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
  let fileBrowser: FileBrowser;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    failOnErrors(page);

    runtime = new Runtime(page);
    fileBrowser = new FileBrowser(page);
    await runtime.loadEditor();
  });

  test("template runs", async () => {
    // Start the project
    await runtime.start();

    // Check the start button does not retain focus
    await expect(
      page.getByRole("button", { name: "Run it!" }),
    ).not.toBeFocused();

    // Check the pygame-ce message is printed
    const outputPanel = page.getByRole("tabpanel", { name: "Output" });
    await expect(outputPanel).toContainText(
      /pygame-ce [\d.]+ \(SDL [\d.]+, Python [\d.]+\)/,
    );

    // Restart the project
    await runtime.stop();
    await runtime.start();

    // Check the message is printed again
    await expect(outputPanel).toContainText(
      /pygame-ce [\d.]+ \(SDL [\d.]+, Python [\d.]+\)/,
    );

    // Stop the project again
    await runtime.stop();
  });

  test("open and close fullscreen", async () => {
    // Toggle fullscreen
    await runtime.fullscreen();

    // Verify canvas is fully visible
    await expect(page.locator("canvas")).toBeInViewport({ ratio: 1 });

    // Verify unable to hover the start button
    const startButton = page.getByRole("button", { name: "Run it!" });
    let failed: boolean = false;
    try {
      await startButton.hover({ timeout: 1000 });
    } catch (e) {
      failed = true;
    }

    expect(failed, "Expect start button not to be hovered").toBeTruthy();

    // Close fullscreen
    await runtime.closeFullscreen();

    // Verify able to hover the start button
    await startButton.hover();
  });

  test("escape closes fullscreen", async () => {
    // Toggle fullscreen
    await runtime.fullscreen();

    // Verify canvas is fully visible
    const canvas = page.locator("canvas");
    await expect(canvas).toBeInViewport({ ratio: 1 });

    // Escape fullscreen
    await canvas.press("Escape");

    // Verify able to hover the start button
    await page.getByRole("button", { name: "Run it!" }).hover();
  });

  test("edits affect execution", async () => {
    // Edit the file
    const editor = page.getByRole("textbox");
    await editor.fill(["def main():", '    print("hi")'].join("\n"));

    // Start the project
    await runtime.start();

    // Check the message is printed
    const outputPanel = page.getByRole("tabpanel", { name: "Output" });
    await expect(outputPanel).toContainText("hi");

    // Replace with empty function
    await editor.fill(["def main():", "    pass"].join("\n"));

    // Re-start the project
    await runtime.start();

    // Expect the output to be empty
    await expect(outputPanel).toContainText(/^$/);
  });

  test("editing imported modules affect execution", async () => {
    // Setup the main file
    const editor = page.getByRole("textbox");
    await editor.fill(
      [
        "import module_test",
        "def main():",
        "    module_test.test_function()",
      ].join("\n"),
    );

    // Create module
    await fileBrowser.createFile("module_test.py");
    await editor.fill(
      ["def test_function():", '    print("Original content")'].join("\n"),
    );

    // Start the project
    await runtime.start();

    // Check the original message is printed
    const outputPanel = page.getByRole("tabpanel", { name: "Output" });
    await expect(outputPanel).toContainText("Original content");

    // Modify module
    await editor.fill(
      ["def test_function():", '    print("Modified content")'].join("\n"),
    );

    // Restart the project
    await runtime.start();

    // Check the modified message is printed
    await expect(outputPanel).toContainText("Modified content");

    // Re-select main file
    await fileBrowser.getItem("main.py").then((i) => i.click());
    await expect(editor).toContainText("def main():");
  });

  test("tab indents code", async () => {
    // Add initial content
    const editor = page.getByRole("textbox");
    await editor.fill("# Indent test");

    // Check the tab escape hint is shows on focus
    await editor.focus();
    const hint = page.getByText(
      "Editor is focused, press Escape to navigate to other elements using tab.",
    );
    await expect(hint).toBeVisible();

    // Try to indent
    await editor.press("Tab");
    await expect(editor).toContainText("    # Indent test");

    // Check hint hides if focus lost
    await editor.blur();
    await expect(hint).toBeHidden();
  });

  test("edits persist across reloads", async ({ browserName }) => {
    // FIXME: Webkit seems to raise a COEP error on reload when served by Vite
    test.skip(browserName === "webkit", "Reload fails due to COEP");

    const marker = "# Persistence test";

    // Edit the file
    const editor = page.getByRole("textbox");
    await editor.fill(marker);
    await expect(editor).toContainText(marker);

    // Reload the page
    await runtime.loadEditor();

    // Assert content remained the same
    await expect(editor).toContainText(marker);
  });

  test("blank files are written correctly", async ({ browserName }) => {
    // FIXME: Webkit seems to raise a COEP error on reload when served by Vite
    test.skip(browserName === "webkit", "Reload fails due to COEP");

    // Clear the file
    const editor = page.getByRole("textbox");
    await editor.fill("");
    await expect(editor).toContainText(/^$/);

    // Reload the page
    await runtime.loadEditor();

    // Assert file remained empty
    await expect(editor).toContainText(/^$/);
  });

  test("sync error is handled", async () => {
    // Edit the file to raise an error
    const editor = page.getByRole("textbox");
    await editor.fill(
      ["def main():", '    raise RuntimeError("sync test")'].join("\n"),
    );

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
    await editor.fill(
      ["def main():", '    print("sync error fixed")'].join("\n"),
    );

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
      ["async def main():", '    raise RuntimeError("async test")'].join("\n"),
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
      ["async def main():", '    print("async error fixed")'].join("\n"),
    );

    // Run the fixed project
    await runtime.start();

    // Check the panel swaps back and prints
    const outputPanel = page.getByRole("tabpanel", { name: "Output" });
    await expect(outputPanel).toBeVisible();
    await expect(outputPanel).toContainText("async error fixed");
  });

  test("missing main displays error", async () => {
    // Edit the file to be missing main
    const editor = page.getByRole("textbox");
    await editor.fill(["def not_main():", "    pass"].join("\n"));

    // Start the project
    await runtime.start();

    // Check the error is printed
    const errorPanel = page.getByRole("tabpanel", { name: "Errors" });
    await expect(errorPanel).toBeVisible();
    await expect(errorPanel).toContainText(
      "SystemError: main.py does not have a function 'main' to run",
    );
  });

  test("console scroll follows output", async () => {
    // Edit the file to print 100 lines
    const editor = page.getByRole("textbox");
    await editor.fill(
      ["def main(): ", "    for _ in range(100):", '        print("hi")'].join(
        "\n",
      ),
    );

    // Start the project
    await runtime.start();

    // Check the lines have printed and console scrolls
    const outputPanel = page.getByRole("tabpanel", { name: "Output" });
    await expect(outputPanel).toContainText("hi\n".repeat(100));
    const scrollPercent = await outputPanel
      .locator("pre")
      .evaluate((el) => el.scrollTop / (el.scrollHeight - el.clientHeight));
    expect(scrollPercent).toBe(1);
  });

  test("pygame input works", async () => {
    // Edit the file to run the input tester
    const editor = page.getByRole("textbox");
    await editor.fill(
      await readFile(`${import.meta.dirname}/resources/input_test.py`, {
        encoding: "utf-8",
      }),
    );

    // Start the project
    await runtime.start();

    // Expect focus notice to be shown
    const focusNotice = page.getByText(
      "Game is receiving inputs, press Escape to return to the editor",
    );
    await expect(focusNotice).toBeVisible();

    // Wait for the start indicator
    const outputPanel = page.getByRole("tabpanel", { name: "Output" });
    await expect(outputPanel).toContainText("Ready!");

    // Test mouse
    const canvas = page.locator("canvas");
    await canvas.click({ position: { x: 10, y: 20 } });
    await expect(outputPanel).toContainText(
      // Positions don't match due to canvas scaling, but are consistent
      ["Mouse Pressed: 1 (16, 33)", "Mouse Released: 1 (16, 33)"].join("\n"),
    );

    // Test keyboard
    await canvas.press("a");
    await expect(outputPanel).toContainText(
      ["Key Pressed: a", "Key Released: a"].join("\n"),
    );

    // Test touch
    const boundingBox = await canvas.boundingBox();
    expect(boundingBox).not.toBeNull();
    await page.touchscreen.tap(boundingBox!.x + 20, boundingBox!.y + 10);
    await expect(outputPanel).toContainText(
      ["Mouse Pressed: 1 (33, 16)", "Mouse Released: 1 (33, 16)"].join("\n"),
    );

    // Escape stops input
    await canvas.press("Escape");
    await expect(outputPanel).not.toContainText(
      ["Key Pressed: Escape", "Key Released: Escape"].join("\n"),
    );

    await canvas.press("b");
    await expect(outputPanel).toContainText(
      ["Key Pressed: b", "Key Released: b"].join("\n"),
    );

    // Expect focus notice to be hidden
    await expect(focusNotice).toBeHidden();
  });
});
