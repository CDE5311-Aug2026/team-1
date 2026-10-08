import { test, expect } from "@playwright/test";
test("home assets and layout render without browser errors", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(
    page.getByRole("heading", { name: "Chope", exact: true }),
  ).toBeVisible();
  const images = await page
    .locator("img")
    .evaluateAll((nodes) =>
      nodes.map((n) => ({
        src: n.getAttribute("src"),
        loaded: n.complete && n.naturalWidth > 0,
        w: n.width,
        h: n.height,
      })),
    );
  expect(images.every((x) => x.loaded && x.w > 0 && x.h > 0)).toBeTruthy();
  expect(images.every((x) => x.src.startsWith("/assets/"))).toBeTruthy();
  expect(errors).toEqual([]);
  await page.screenshot({ path: "test-results/prototype-home.png" });
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.locator(".lesson-image")).toBeVisible();
  await page.screenshot({ path: "test-results/prototype-lesson.png" });
});
test("complete lessons and persist progress after reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Can! You did it." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.reload();
  await expect(page.getByText("3 of 3 learned today")).toBeVisible();
});
test("detail dialog saves and marks a phrase learned", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Detail", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Save expression", exact: true })
    .click();
  await page.getByRole("button", { name: "Mark as learned" }).click();
  await expect(page.getByText("1 of 3 learned today")).toBeVisible();
  await page.getByRole("button", { name: "My Space", exact: true }).click();
  await page.getByRole("button", { name: "Chope", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Unsave", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog")).toHaveCount(0);
});
test("ask, community, and moments interactions work", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await page.getByLabel("What did you hear?").fill("What does paiseh mean?");
  await page
    .locator("form")
    .getByRole("button", { name: "Ask", exact: true })
    .click();
  await expect(page.locator(".answer")).toContainText("soft, polite apology");
  await page.getByRole("button", { name: "Community", exact: true }).click();
  await page.getByRole("button", { name: "♡ 12 · Like", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "♡ 13 · Liked", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Moments", exact: true }).click();
  await page.getByLabel("Today's moment").fill("I choped a table today!");
  await page.getByRole("button", { name: "Save moment" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Moments", exact: true }).click();
  await expect(page.getByText("I choped a table today!")).toBeVisible();
});
test("small mobile and desktop views have no horizontal overflow", async ({
  page,
}) => {
  for (const width of [360, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.getByRole("button", { name: "Start", exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
});
