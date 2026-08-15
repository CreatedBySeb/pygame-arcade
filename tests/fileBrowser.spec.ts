import test, { expect, type Page } from "@playwright/test";
import { FileBrowser, Runtime } from "./helpers";

test.describe("file browser", () => {
  test.describe.configure({ mode: "serial" });

  let fileBrowser: FileBrowser;
  let page: Page;
  let runtime: Runtime;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    fileBrowser = new FileBrowser(page);
    runtime = new Runtime(page);
    await runtime.loadEditor();
  });

  test("upload single", async () => {
    // Upload file
    await fileBrowser.uploadFiles(`${import.meta.dirname}/resources/empty.txt`);

    // Check for the new entry
    const item = await fileBrowser.getItem("empty.txt");
    await item.click();
    await expect(page.getByRole("textbox")).toContainText(/^$/);
  });

  test("upload multiple", async () => {
    const fileNames = ["file1.txt", "file2.txt"];

    await fileBrowser.uploadFiles(
      fileNames.map((file) => `${import.meta.dirname}/resources/${file}`),
    );

    // Check for the new entries
    for (const name of fileNames) {
      await fileBrowser.getItem(name);
    }
  });

  test("create file", async () => {
    // Create the file
    await fileBrowser.createFile("file.py");

    // Check for the new file
    const file = await fileBrowser.getItem("file.py");
    await expect(file).toBeChecked();

    // Check content is switched
    await expect(page.getByRole("textbox")).toContainText(
      "def my_func() -> None:",
    );
  });

  test("create nested file with path", async () => {
    await fileBrowser.createFile("file_with_path/file.py");

    // Check for the new parent folder
    const dirItem = await fileBrowser.getItem("file_with_path");

    // Check for the new file
    const file = await fileBrowser.getItem("file.py", dirItem);
    await expect(file).toBeChecked();
  });

  test("create nested file with focus", async () => {
    await fileBrowser.createFolder("file_with_focus");

    // Focus the folder
    const dirItem = await fileBrowser.getItem("file_with_focus");
    await dirItem.click();

    // Create file within folder
    await fileBrowser.createFile("file.py");

    // Check for the new file
    const fileItem = await fileBrowser.getItem("file.py", dirItem);
    await expect(fileItem).toBeChecked();

    // Unfocus the folder for the next test
    await dirItem.click();
  });

  test("create folder", async () => {
    await fileBrowser.createFolder("folder");

    // Check for the new entry
    await fileBrowser.getItem("folder");
  });

  test("create nested folder with path", async () => {
    await fileBrowser.createFolder("parent_with_path/child_folder");

    // Check for the parent folder
    const parentItem = await fileBrowser.getItem("parent_with_path");
    await parentItem.click();

    // Check for the child folder
    await fileBrowser.getItem("child_folder", parentItem);
  });

  test("create nested folder with focus", async () => {
    await fileBrowser.createFolder("parent_with_focus");

    // Check for the parent folder
    const parentItem = await fileBrowser.getItem("parent_with_focus");
    await parentItem.click();

    // Create the folder within folder
    await fileBrowser.createFolder("child_folder");

    // Check for the child folder
    await fileBrowser.getItem("child_folder", parentItem);

    // Unfocus the folder for the next test
    await parentItem.click();
  });
});
