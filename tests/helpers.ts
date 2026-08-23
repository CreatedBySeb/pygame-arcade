import {
  expect,
  type ConsoleMessage,
  type Download,
  type Locator,
  type Page,
} from "@playwright/test";

/**
 * How long to wait for the runtime to load
 *
 * This seems to take a while on headless Firefox
 */
const LOAD_TIMEOUT = 60_000;

/**
 * An error thrown when the browser logs a console error during a test
 */
class ConsoleLogError extends Error {
  public consoleMessage: ConsoleMessage;
  public readonly name = "ConsoleLogError";

  constructor(message: ConsoleMessage) {
    const thread = message.worker() ? "worker" : "main";
    const { column, line, url } = message.location();
    super(
      `Console error logged at ${url}:${line}:${column} by ${thread} thread: ${message.text()}`,
    );
    this.consoleMessage = message;
  }
}

/**
 * An error thrown when there is an uncaught exception thrown during a test
 */
class UncaughtExceptionError extends Error {
  public cause: Error;
  public readonly name = "UncaughtExceptionError";

  constructor(cause: Error) {
    super(`Error thrown: ${cause.message}\n${cause.stack}`);
    this.cause = cause;
  }
}

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
   * Deletes the focused file or folder
   */
  public async delete(): Promise<void> {
    // Trigger the modal
    await this.page.getByRole("button", { name: "Delete File/Folder" }).click();

    // Find the modal
    const modal = this.page
      .getByRole("alertdialog")
      .filter({ hasText: "Confirm Delete" });

    await expect(modal).toBeVisible();

    // Confirm the action
    await modal.getByRole("button", { name: "Confirm Delete" }).click();
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
   * Refresh the files and folders
   */
  public async refresh(): Promise<void> {
    // Click the button
    await this.page.getByRole("button", { name: "Refresh Files" }).click();
  }

  /**
   * Renames the focused file or folder
   * @param name The new name
   */
  public async rename(name: string, file: boolean): Promise<void> {
    const noun = file ? "File" : "Folder";

    // Trigger the modal
    const modal = await this.openModal("Rename File/Folder", "Rename " + noun);

    // Fill in the new name
    await modal.getByRole("textbox").fill(name);

    // Confirm the action
    await modal.getByRole("button", { name: "Rename" }).click();
    await expect(modal).toBeHidden();
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

export class Project extends TestHelper {
  /**
   * Exports the project as a zip and returns the download
   * @returns The download for the project
   */
  public async download(): Promise<Download> {
    // Prepare to catch download event
    const downloadPromise = this.page.waitForEvent("download");

    // Trigger the download
    const projectMenu = await this.openProjectMenu();
    await projectMenu
      .getByRole("menuitem", { name: "Download as Zip" })
      .click();

    // Return the caught download event
    return await downloadPromise;
  }

  /**
   * Resets the project
   */
  public async erase(): Promise<void> {
    // Trigger the reset
    const projectMenu = await this.openProjectMenu();
    await projectMenu
      .getByRole("menuitem", { name: "Erase all Files" })
      .click();

    // Find the modal and confirm
    const modal = this.page
      .getByRole("alertdialog")
      .filter({ hasText: "Confirm Project Erase" });

    await expect(modal).toBeVisible();
    await modal.getByRole("button", { name: "Confirm Erase" }).click();
    await expect(modal).toBeHidden();
  }

  /**
   * Imports a project from a zip file
   * @param file The path to the zip file to import
   */
  public async import(file: string): Promise<void> {
    // Prepare to catch the upload event
    const fileChooserPromise = this.page.waitForEvent("filechooser");

    // Select import from the project menu
    const projectMenu = await this.openProjectMenu();
    await projectMenu
      .getByRole("menuitem", { name: "Import from Zip" })
      .click();

    // Find the modal
    const modal = this.page
      .getByRole("dialog")
      .filter({ hasText: "Import Project" });

    await expect(modal).toBeVisible();

    // Select the zip file
    await modal.getByRole("button", { name: "Select Zip File" }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(file);
    await expect(modal).toBeHidden();
  }

  /**
   * Opens the project menu and returns a locator for it
   * @returns A Locator for the project menu
   */
  public async openProjectMenu(): Promise<Locator> {
    const projectButton = this.page.getByRole("button", { name: "Menu" });
    await projectButton.click();

    const projectMenu = this.page.getByRole("menu");
    await expect(projectMenu).toBeVisible();
    return projectMenu;
  }
}

export class Runtime extends TestHelper {
  /**
   * Assets the prompt to open a file is visible, which is displayed when the
   * editor is closed/has no file focused
   */
  public async editorIsClosed(): Promise<void> {
    await expect(this.page.getByText("No file open")).toBeVisible();
  }

  /**
   * Navigate to the editor and wait for it to load
   */
  public async loadEditor(): Promise<void> {
    await this.page.goto("/");
    await this.waitForLoad();
  }

  /**
   * Press the start button
   */
  public async start(): Promise<void> {
    const button = this.page.getByRole("button", { name: "Run it!" });
    await button.click();
  }

  /**
   * Press the stop button
   */
  public async stop(): Promise<void> {
    const button = this.page.getByRole("button", { name: "Stop" });
    await button.click();
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

/**
 * Adds a handler to throw an error if the browser logs to the console during a
 * test or there is an uncaught exception
 * @param page The page to configure the handlers on
 */
export function failOnErrors(page: Page): void {
  page.on("console", (message) => {
    if (message.type() === "error") {
      throw new ConsoleLogError(message);
    }
  });

  page.on("pageerror", (err) => {
    throw new UncaughtExceptionError(err);
  });
}
