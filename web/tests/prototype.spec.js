import { test, expect } from "@playwright/test";
const screens = [
  "home",
  "lesson",
  "ask",
  "community",
  "question",
  "moments",
  "nearby",
  "places",
  "profile",
  "notices",
  "details",
  "edit",
  "confirmed",
  "rejected",
  "welcome",
  "time",
  "topics",
  "quiz",
  "result",
];
test("all 19 reference screens load local assets and render without errors", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const screen of screens) {
    await page.goto("/?screen=" + screen + "&reference=1");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".design-screen")).toHaveAttribute(
      "data-screen",
      screen,
    );
    await expect
      .poll(() =>
        page
          .locator("img")
          .evaluateAll((ns) =>
            ns.every(
              (n) =>
                n.complete && n.naturalWidth > 0 && n.width > 0 && n.height > 0,
            ),
          ),
      )
      .toBe(true);
    expect(
      await page
        .locator("img")
        .evaluateAll((ns) =>
          ns.every((n) => n.getAttribute("src").startsWith("/assets/")),
        ),
    ).toBe(true);
    await page.screenshot({ path: "test-results/screens/" + screen + ".png" });
  }
  expect(errors).toEqual([]);
});
test("Home and lesson match the major Figma frame geometry", async ({
  page,
}) => {
  await page.goto("/?screen=home");
  await page.evaluate(() => document.fonts.ready);
  for (const [id, x, y, width, height] of [
    ["1:87", 20, 116, 350, 144],
    ["18:1949", 20, 270, 350, 52],
    ["1:120", 20, 332, 350, 143],
    ["1:185", 20, 485, 350, 144],
    ["1:252", 20, 638, 350, 143],
    ["1:317", 20, 758, 350, 58],
  ])
    expect(await page.locator(`[data-node-id="${id}"]`).boundingBox()).toEqual({
      x,
      y,
      width,
      height,
    });
  expect(
    (await page.locator('[data-node-id="1:86"]').boundingBox()).height,
  ).toBe(64);
  await page.getByRole("button", { name: "Start", exact: true }).click();
  expect(await page.locator('[data-node-id="1:478"]').boundingBox()).toEqual({
    x: 20,
    y: 275,
    width: 350,
    height: 425,
  });
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Can! You did it.");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.reload();
  await expect(page.getByText("3 of 3 learned today")).toBeVisible();
});
test("onboarding completes three questions and persists the resulting level", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Get started" }).click();
  await page
    .getByRole("button", { name: "Less than 3 months", exact: true })
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Daily life", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  for (const name of ["Answer A", "Answer B", "Answer C"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
  }
  await expect(
    page.getByText("You're Experienced", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .click();
  await page.reload();
  await expect(page.locator(".design-screen")).toHaveAttribute(
    "data-screen",
    "home",
  );
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("singlish-v2-state")).profile.level,
    ),
  ).toBe("Experienced");
});
test("profile editing and all five switches persist, with switches initially off", async ({
  page,
}) => {
  await page.goto("/?screen=profile");
  for (const name of ["daily", "occasions", "local", "rehearse", "judgement"])
    await expect(
      page.getByRole("switch", { name, exact: true }),
    ).toHaveAttribute("aria-checked", "false");
  await page.getByRole("button", { name: "Edit From", exact: true }).click();
  await page.getByRole("dialog").locator("input").fill("Malaysia");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("switch", { name: "daily", exact: true }).click();
  await page.reload();
  await expect(page.getByText("Malaysia", { exact: false })).toBeVisible();
  await expect(
    page.getByRole("switch", { name: "daily", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Delete From", exact: true }).click();
  await expect(page.getByText("Not set")).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByText("Malaysia", { exact: false })).toBeVisible();
});
test("AI notice edit, confirm, reject and undo work", async ({ page }) => {
  await page.goto("/?screen=profile");
  await page.getByRole("switch", { name: "occasions", exact: true }).click();
  await page.getByRole("button", { name: "Notices", exact: true }).click();
  await page.getByRole("button", { name: "Details", exact: true }).click();
  await page.getByRole("button", { name: "Edit details" }).first().click();
  await page.getByLabel("Occasion", { exact: true }).fill("Lunch");
  await page.getByLabel("With", { exact: true }).fill("Friends");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Lunch", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.locator(".design-screen")).toHaveAttribute(
    "data-screen",
    "confirmed",
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("button", { name: "Not right", exact: true }).click();
  await expect(page.locator(".design-screen")).toHaveAttribute(
    "data-screen",
    "rejected",
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".design-screen")).toHaveAttribute(
    "data-screen",
    "notices",
  );
});
test("Ask context, query, report, lookup deletion and undo work", async ({
  page,
}) => {
  await page.goto("/?screen=ask");
  await page.getByRole("button", { name: "Choose context" }).first().click();
  await page
    .getByRole("dialog")
    .locator("select")
    .selectOption("Office · work");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByLabel("Ask IntentAI anything").fill("What does paiseh mean?");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByText(/Paiseh: Sorry or embarrassed/)).toBeVisible();
  await page.getByRole("button", { name: "Report", exact: true }).click();
  await page
    .getByRole("dialog")
    .locator("textarea")
    .fill("Please check this wording.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Moments", exact: true }).click();
  await expect(page.getByText("Paiseh", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Delete Paiseh", exact: true })
    .click();
  await expect(page.getByText("Paiseh", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByText("Paiseh", { exact: true })).toBeVisible();
});
test("Community anonymous question, context, answer and withdrawal work", async ({
  page,
}) => {
  await page.goto("/?screen=community");
  await page.getByRole("button", { name: "Ask a local", exact: true }).click();
  await page.getByRole("dialog").locator("textarea").fill("Is chope polite?");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Open question Is chope polite?",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Add more context", exact: true })
    .click();
  await page.getByRole("dialog").locator("textarea").fill("At a hawker centre");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("switch", { name: "local", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Open question Is chope polite?",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Answer question", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .locator("textarea")
    .fill("It is common at hawker centres.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Open question Is chope polite?",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("It is common at hawker centres.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Withdraw", exact: true }).click();
  await expect(page.getByText("Is chope polite?", { exact: true })).toHaveCount(
    0,
  );
});
test("Nearby manual place selection and data deletion work", async ({
  page,
}) => {
  await page.goto("/?screen=home");
  await page.getByRole("button", { name: "Near you", exact: true }).click();
  await page.getByRole("button", { name: "Change", exact: true }).click();
  await expect(
    page.getByRole("switch", { name: "Use my location" }),
  ).toHaveAttribute("aria-checked", "false");
  await page.getByRole("button", { name: "Office", exact: true }).click();
  await page.getByRole("button", { name: "Show phrases", exact: true }).click();
  await expect(page.locator('[data-node-id="11:1779"]')).toHaveText("Office");
  await page.getByRole("button", { name: "My Space", exact: true }).click();
  await page.getByRole("button", { name: "Notices", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete all my data", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete all my data", exact: true })
    .click();
  await expect(page.locator(".design-screen")).toHaveAttribute(
    "data-screen",
    "welcome",
  );
});
test("all screens fit 320px, 390px and desktop widths", async ({ page }) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const screen of screens) {
      await page.goto("/?screen=" + screen);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
});
