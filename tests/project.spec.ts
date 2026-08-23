import test, { expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import type Stream from "node:stream";
import { openPromise } from "yauzl";
import { FileBrowser, Project, Runtime, failOnErrors } from "./helpers";

// SHA-256 hash for the main.py file in the template
const MAIN_PY_HASH =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

test.describe("project", () => {
  let fileBrowser: FileBrowser;
  let page: Page;
  let project: Project;
  let runtime: Runtime;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    failOnErrors(page);

    fileBrowser = new FileBrowser(page);
    project = new Project(page);
    runtime = new Runtime(page);

    await runtime.loadEditor();
  });

  test("export project", async () => {
    const download = await project.download();
    expect(download.suggestedFilename()).toBe("project.zip");

    // Download the zip and open it
    const zipPath = await download.path();
    const zipFile = await openPromise(zipPath);
    expect(zipFile.entryCount, "Expect zip to only have 1 file").toBe(1);

    // Find main.py in the zip file
    let mainPy: Stream.Readable | undefined = undefined;

    for await (const entry of zipFile.eachEntry()) {
      if (entry.fileName !== "main.py") {
        continue;
      }

      mainPy = await zipFile.openReadStreamPromise(entry);
    }

    // Expect main.py to have been found
    expect(mainPy, "Expect zip to contain main.py").toBeDefined();

    // Compare the hashes
    const hash = createHash("sha256");
    const digest = mainPy?.pipe(hash).digest("hex");
    expect(digest, "Expect main.py hash to match").toBe(MAIN_PY_HASH);
  });

  test("import project", async () => {
    await project.import(`${import.meta.dirname}/resources/import.zip`);

    const item = await fileBrowser.getItem("main.py");
    await item.click();
    await expect(page.getByRole("textbox")).toContainText(
      "# Project import test",
    );
  });

  test("reset project", async () => {
    // Setup some changes
    const editor = page.getByRole("textbox");
    await editor.fill("# Reset test");
    await fileBrowser.createFile("reset.py");

    // Erase the project
    await project.erase();

    // Check the edits are gone
    const fileItem = page.getByRole("treeitem", { name: "reset.py" });
    await expect(fileItem).toBeHidden();
    await expect(editor).toContainText(
      "# Define the main function for your game",
    );
  });

  test("open about dialog", async () => {
    // Open project menu
    const menu = await project.openProjectMenu();

    // Click about item
    await menu.getByRole("menuitem", { name: "About" }).click();

    // Check modal
    const dialog = page.getByRole("dialog", { name: "About Pygame Arcade" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/Built from commit: [0-9a-f]{7}/);
    await expect(dialog).toContainText(/Pyodide version: \d+\.\d+\.\d+/);
    await expect(dialog).toContainText(/Python version: \d+\.\d+\.\d+/);
    await expect(dialog).toContainText(
      /Pygame Community Edition version: \d+\.\d+\.\d+/,
    );

    // Close modal
    await dialog.getByRole("button", { name: "Close" }).click();

    // Check no longer visible
    await expect(dialog).toBeHidden();
  });

  test("open GitHub", async () => {
    // Open project menu
    const menu = await project.openProjectMenu();

    // Click GitHub link
    const newTabPromise = page.waitForEvent("popup");
    await menu.getByRole("link", { name: "View on GitHub" }).click();

    // Verify new tab is correct and original page hasn't changed
    const tab = await newTabPromise;
    await tab.waitForLoadState("load");
    await expect(tab).toHaveURL(
      "https://github.com/CreatedBySeb/pygame-arcade",
    );
    await expect(page).toHaveURL("/");
  });

  test("open feedback form", async () => {
    // Open project menu
    const menu = await project.openProjectMenu();

    // Click Feedback link
    const newTabPromise = page.waitForEvent("popup");
    await menu.getByRole("link", { name: "Provide Feedback" }).click();

    // Verify new tab is correct and original page hasn't changed
    const tab = await newTabPromise;
    await tab.waitForLoadState("load");
    await expect(tab).toHaveURL(
      new URLPattern({ hostname: "docs.google.com" }),
    );
    await expect(page).toHaveURL("/");
  });
});
