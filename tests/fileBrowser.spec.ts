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

  test("delete file", async () => {
    await fileBrowser.createFile("delete_file.py");

    // Get the file
    const file = await fileBrowser.getItem("delete_file.py");
    await file.click();

    // Delete the file
    await fileBrowser.delete();

    // Check no longer visible
    await expect(file).toBeHidden();

    // Refresh file browser
    await fileBrowser.refresh();

    // Check still not visible
    await expect(file).toBeHidden();
  });

  test("delete folder", async () => {
    await fileBrowser.createFolder("delete_folder");

    // Get the folder
    const folder = await fileBrowser.getItem("delete_folder");
    await folder.click();

    // Delete the folder
    await fileBrowser.delete();

    // Check no longer visible
    await expect(folder).toBeHidden();

    // Refresh file browser
    await fileBrowser.refresh();

    // Check still not visible
    await expect(folder).toBeHidden();
  });

  test("delete nested", async () => {
    await fileBrowser.createFile("delete_nested/nested_sub/nested_file.txt");

    // Get the folder
    const folder = await fileBrowser.getItem("delete_nested");
    await folder.click({ position: { x: 50, y: 4 } }); // Ensure to click at top on target

    // Delete the folder
    await fileBrowser.delete();

    // Check no longer visible
    await expect(folder).toBeHidden();

    // Refresh file browser
    await fileBrowser.refresh();

    // Check still not visible
    await expect(folder).toBeHidden();
  });

  test("delete within", async () => {
    await fileBrowser.createFile("delete_within/within.txt");

    // Get the file
    const file = await fileBrowser.getItem("within.txt");
    await file.click();

    // Delete the folder
    await fileBrowser.delete();

    // Check no longer visible
    await expect(file).toBeHidden();

    // Refresh file browser
    await fileBrowser.refresh();

    // Check still not visible
    await expect(file).toBeHidden();

    // Check folder still visible
    await fileBrowser.getItem("delete_within");
  });

  test("folder expands on toggle", async () => {
    // Create and focus folder
    await fileBrowser.createFolder("expand_toggle");
    const folder = await fileBrowser.getItem("expand_toggle");
    await folder.click();

    // Upload file
    await fileBrowser.uploadFiles(`${import.meta.dirname}/resources/empty.txt`);
    const file = await fileBrowser.getItem("empty.txt", folder);

    // Collapse folder
    await folder.getByRole("button").click();
    await expect(file).toBeHidden();

    // Expand folder
    await folder.getByRole("button").click();
    await expect(file).toBeVisible();
  });

  test("folder expands on select", async () => {
    // Create and focus folder
    await fileBrowser.createFolder("expand_select");
    const folder = await fileBrowser.getItem("expand_select");
    await folder.click();

    // Upload file
    await fileBrowser.uploadFiles(`${import.meta.dirname}/resources/empty.txt`);
    const file = await fileBrowser.getItem("empty.txt", folder);

    // Collapse folder
    await folder.getByText("expand_select").click();
    await expect(file).toBeHidden();

    // Expand folder
    await folder.click();
    await expect(file).toBeVisible();
  });

  test("clicking empty space deselects", async () => {
    // Ensure main.py is selected
    const file = await fileBrowser.getItem("main.py");
    await file.click();
    await expect(file).toBeChecked();

    // Click empty space
    const tree = page.getByRole("tree");
    const boundingBox = await tree.boundingBox();
    expect(boundingBox).not.toBeNull();
    const { height, x, y } = boundingBox!;
    await page.click("body", { position: { x: x + 10, y: y + height + 10 } });

    // Verify deselected
    await expect(file).not.toBeChecked();
  });
});
