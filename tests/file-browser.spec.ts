import test, { expect, type Locator, type Page } from "@playwright/test";

/**
 * Opens a modal, asserts it is visible, and returns its locator
 * @param page The Page instance
 * @param button The name of the button that opens the modal
 * @param title The title of the modal, if different from the button name
 * @returns A Locator for the modal
 */
async function openModal(
  page: Page,
  button: string,
  title?: string,
): Promise<Locator> {
  await page.getByRole("button", { name: button }).click();
  const modal = page.getByRole("dialog").filter({ hasText: title ?? button });
  await expect(modal).toBeVisible();
  return modal;
}

test.describe("file browser", () => {
  test.describe.configure({ mode: "serial" });

  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto("/");

    await expect(page.getByText("Loading Python...")).toBeHidden({
      timeout: 60_000, // Loading may take a while depending on network
    });
  });

  test("upload single", async () => {
    // Open the modal
    const modal = await openModal(page, "Upload File", "Upload Files");

    // Upload file
    const fileChooserPromise = page.waitForEvent("filechooser");
    await modal.getByRole("button", { name: "Browse" }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles("tests/resources/empty.txt");
    await expect(modal).toBeHidden();

    // Check for the new entry
    const item = page.getByRole("treeitem", { name: "empty.txt" });
    await expect(item).toBeVisible();
    await item.click();
    await expect(page.getByRole("textbox")).toContainText(/^$/);
  });

  test("upload multiple", async () => {
    const fileNames = ["file1.txt", "file2.txt"];

    // Open the modal
    const modal = await openModal(page, "Upload File", "Upload Files");

    // Upload files
    const fileChooserPromise = page.waitForEvent("filechooser");
    await modal.getByRole("button", { name: "Browse" }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(
      fileNames.map((file) => `tests/resources/${file}`),
    );
    await expect(modal).toBeHidden();

    // Check for the new entries
    for (const name of fileNames) {
      const item = page.getByRole("treeitem", { name });
      await expect(item).toBeVisible();
    }
  });

  test("create file", async () => {
    // Open the modal
    const modal = await openModal(page, "Create Text File");

    // Fill in and close the modal
    await modal.getByRole("textbox", { name: "Name" }).fill("file.py");
    await modal.getByRole("button", { name: "Create" }).click();
    await expect(modal).toBeHidden();

    // Check for the new file
    const item = page.getByRole("treeitem", { name: "file.py" });
    await expect(item).toBeVisible();

    // Check content is switched
    await expect(page.getByRole("textbox")).toContainText(
      "def my_func() -> None:",
    );
  });

  test("create nested file with path", async () => {
    // Open the modal
    const modal = await openModal(page, "Create Text File");

    // Fill in and close the modal
    await modal
      .getByRole("textbox", { name: "Name" })
      .fill("file_with_path/file.py");
    await modal.getByRole("button", { name: "Create" }).click();
    await expect(modal).toBeHidden();

    // Check for the new parent folder
    const dirItem = page.getByRole("treeitem", { name: "file_with_path" });
    await expect(dirItem).toBeVisible();
    await dirItem.click();

    // Check for the new file
    const fileItem = dirItem.getByRole("treeitem", { name: "file.py" });
    await expect(fileItem).toBeVisible();
  });

  test("create nested file with focus", async () => {
    // Open the folder modal
    const dirModal = await openModal(page, "Create Folder");

    // Fill in and close the folder modal
    await dirModal
      .getByRole("textbox", { name: "Name" })
      .fill("file_with_focus");
    await dirModal.getByRole("button", { name: "Create" }).click();
    await expect(dirModal).toBeHidden();

    // Check for the new folder
    const item = page.getByRole("treeitem", { name: "file_with_focus" });
    await expect(item).toBeVisible();

    // Focus the folder
    const dirItem = page.getByRole("treeitem", { name: "file_with_focus" });
    await expect(dirItem).toBeVisible();
    await dirItem.click();

    // Open the file modal
    const fileModal = await openModal(page, "Create Text File");

    // Fill in and close the file modal
    await fileModal.getByRole("textbox", { name: "Name" }).fill("file.py");
    await fileModal.getByRole("button", { name: "Create" }).click();
    await expect(fileModal).toBeHidden();

    // Check for the new file
    const fileItem = dirItem.getByRole("treeitem", { name: "file.py" });
    await expect(fileItem).toBeVisible();

    // Unfocus the folder for the next test
    await dirItem.click();
  });

  test("create folder", async () => {
    // Open the modal
    const modal = await openModal(page, "Create Folder");

    // Fill in and close the modal
    await modal.getByRole("textbox", { name: "Name" }).fill("folder");
    await modal.getByRole("button", { name: "Create" }).click();
    await expect(modal).toBeHidden();

    // Check for the new entry
    const item = page.getByRole("treeitem", { name: "folder" });
    await expect(item).toBeVisible();
  });

  test("create nested folder with path", async () => {
    // Open the modal
    const modal = await openModal(page, "Create Folder");

    // Fill in and close the modal
    await modal
      .getByRole("textbox", { name: "Name" })
      .fill("parent_with_path/child_folder");
    await modal.getByRole("button", { name: "Create" }).click();
    await expect(modal).toBeHidden();

    // Check for the parent folder
    const parentItem = page.getByRole("treeitem", { name: "parent_with_path" });
    await expect(parentItem).toBeVisible();
    await parentItem.click();

    // Check for the child folder
    const childItem = parentItem.getByRole("treeitem", {
      name: "child_folder",
    });
    await expect(childItem).toBeVisible();
  });

  test("create nested folder with focus", async () => {
    // Open the modal
    const modal = await openModal(page, "Create Folder");

    // Fill in and close the modal
    await modal
      .getByRole("textbox", { name: "Name" })
      .fill("parent_with_focus");
    await modal.getByRole("button", { name: "Create" }).click();
    await expect(modal).toBeHidden();

    // Check for the parent folder
    const parentItem = page.getByRole("treeitem", {
      name: "parent_with_focus",
    });
    await expect(parentItem).toBeVisible();
    await parentItem.click();

    // Open the modal again
    await openModal(page, "Create Folder");

    // Fill in and close the modal
    await modal.getByRole("textbox", { name: "Name" }).fill("child_folder");
    await modal.getByRole("button", { name: "Create" }).click();
    await expect(modal).toBeHidden();

    // Check for the child folder
    const childItem = parentItem.getByRole("treeitem", {
      name: "child_folder",
    });
    await expect(childItem).toBeVisible();

    // Unfocus the folder for the next test
    await parentItem.click();
  });
});
