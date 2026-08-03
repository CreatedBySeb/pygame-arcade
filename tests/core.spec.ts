import { expect, test } from "@playwright/test";

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
