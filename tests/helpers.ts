import { expect, type Locator, type Page } from "@playwright/test";

/**
 * How long to wait for the runtime to load
 *
 * This seems to take a while on headless Firefox
 */
const LOAD_TIMEOUT = 60_000;

class TestHelper {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }
}

export class FileBrowser extends TestHelper {
  /**
   * Creates a new file at the focused point
   * @param path The path to the file, relative to the current focus
   */
  public async createFile(path: string): Promise<void> {
    // Open the modal
    const modal = await this.openModal("Create Text File");

    // Fill in and close the modal
    await modal.getByRole("textbox", { name: "Name" }).fill(path);
    await modal.getByRole("button", { name: "Create" }).click();
    await expect(modal).toBeHidden();
  }

  /**
   * Creates a new folder at the focused point
   * @param path The path to the folder, relative to the current focus
   */
  public async createFolder(path: string): Promise<void> {
    // Open the modal
    const modal = await this.openModal("Create Folder");

    // Fill in and close the modal
    await modal.getByRole("textbox", { name: "Name" }).fill(path);
    await modal.getByRole("button", { name: "Create" }).click();
    await expect(modal).toBeHidden();
  }

  /**
   * Gets a tree item with the provided name, optionally within another item
   * @param name The name of the tree item
   * @param parent The parent tree item to search within, defaults to none
   * @returns The locator to the item
   */
  public async getItem(name: string, parent?: Locator): Promise<Locator> {
    const item = (parent ?? this.page).getByRole("treeitem", { name });
    await expect(item).toBeVisible();
    return item;
  }

  /**
   * Opens a modal, asserts it is visible, and returns its locator
   * @param page The Page instance
   * @param button The name of the button that opens the modal
   * @param title The title of the modal, if different from the button name
   * @returns A Locator for the modal
   */
  public async openModal(button: string, title?: string): Promise<Locator> {
    await this.page.getByRole("button", { name: button }).click();
    const modal = this.page
      .getByRole("dialog")
      .filter({ hasText: title ?? button });
    await expect(modal).toBeVisible();
    return modal;
  }

  /**
   * Upload one or more files to the file system at the focused point
   * @param files The path(s) to the file(s) to upload
   */
  public async uploadFiles(files: string | string[]): Promise<void> {
    // Open the modal
    const modal = await this.openModal("Upload File", "Upload Files");

    // Upload file
    const fileChooserPromise = this.page.waitForEvent("filechooser");
    await modal.getByRole("button", { name: "Browse" }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(files);
    await expect(modal).toBeHidden();
  }
}

export class Runtime extends TestHelper {
  /**
   * Navigate to the editor and wait for it to load
   */
  public async loadEditor(): Promise<void> {
    await this.page.goto("/");
    await this.waitForLoad();
  }

  /**
   * Waits for the runtime to fully load
   */
  public async waitForLoad(): Promise<void> {
    // Expect the "Loading Python..." message to vanish and buttons to enable
    await expect(this.page.getByText("Loading Python...")).toBeHidden({
      timeout: LOAD_TIMEOUT,
    });
  }
}
