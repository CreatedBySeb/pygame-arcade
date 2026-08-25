import test, { expect, type Page } from "@playwright/test";
import { FileBrowser, Runtime, failOnErrors } from "./helpers";

test.describe("file browser", () => {
  test.describe.configure({ mode: "serial" });

  let fileBrowser: FileBrowser;
  let page: Page;
  let runtime: Runtime;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    failOnErrors(page);

    fileBrowser = new FileBrowser(page);
    runtime = new Runtime(page);

    await runtime.loadEditor();
  });

  test.beforeEach(async () => {
    // Ensure nothing is selected before each test for consistency
    await fileBrowser.deselect();
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

    // Check editor closed
    await runtime.editorIsClosed();

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

    // Check editor closed
    await runtime.editorIsClosed();

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

    // Check editor closed
    await runtime.editorIsClosed();

    // Refresh file browser
    await fileBrowser.refresh();

    // Check still not visible
    await expect(file).toBeHidden();

    // Check folder still visible
    await fileBrowser.getItem("delete_within");
  });

  test("rename file", async () => {
    await fileBrowser.createFile("rename_file.txt");

    // Get the file
    const file = await fileBrowser.getItem("rename_file.txt");
    await file.click();

    // Rename the folder
    await fileBrowser.rename("renamed_file.py", true);

    // Check renamed
    const renamed = await fileBrowser.getItem("renamed_file.py");
    await expect(renamed).toBeVisible();
    await expect(file).toBeHidden();

    // Edit the file
    await page.getByRole("textbox").fill("# Renamed file");

    // Refresh file browser
    await fileBrowser.refresh();

    // Check still renamed
    await expect(renamed).toBeVisible();
    await expect(file).toBeHidden();
  });

  test("rename folder", async () => {
    await fileBrowser.createFile("rename_folder/rename_child.txt");

    // Get the folder
    const folder = await fileBrowser.getItem("rename_folder");
    const child = await fileBrowser.getItem("rename_child.txt", folder);
    await folder.click({ position: { x: 50, y: 4 } }); // Ensure to click at top on target

    // Rename the folder
    await fileBrowser.rename("renamed_folder", false);

    // Check renamed
    const renamed = await fileBrowser.getItem("renamed_folder");
    const renamedChild = await fileBrowser.getItem("rename_child.txt", renamed);
    await expect(renamed).toBeVisible();
    await expect(renamedChild).toBeVisible();
    await expect(folder).toBeHidden();
    await expect(child).toBeHidden();

    // Edit the file
    await page.getByRole("textbox").fill("# Renamed folder child");

    // Refresh file browser
    await fileBrowser.refresh();

    // Check still renamed
    await expect(renamed).toBeVisible();
    await expect(renamedChild).toBeVisible();
    await expect(folder).toBeHidden();
    await expect(child).toBeHidden();
  });

  test("rename within", async () => {
    await fileBrowser.createFile("rename_within/rename_target.txt");

    // Get the file
    const folder = await fileBrowser.getItem("rename_within");
    const child = await fileBrowser.getItem("rename_target.txt", folder);
    await child.click();

    // Rename the folder
    await fileBrowser.rename("renamed_target.py", true);

    // Check renamed
    const renamed = await fileBrowser.getItem("renamed_target.py", folder);
    await expect(renamed).toBeVisible();
    await expect(folder).toBeVisible();
    await expect(child).toBeHidden();

    // Edit the file
    await page.getByRole("textbox").fill("# Renamed file within");

    // Refresh file browser
    await fileBrowser.refresh();

    // Check still renamed
    await expect(renamed).toBeVisible();
    await expect(folder).toBeVisible();
    await expect(child).toBeHidden();
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
    await fileBrowser.deselect();

    // Verify deselected
    await expect(file).not.toBeChecked();
  });
});
