import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";

async function login(page, email, password) {
  await page.goto(`${baseUrl}/login`);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15000 });
}

async function signOut(page) {
  await page.getByRole("button", { name: /sign out/i }).click();
  await page.waitForURL("**/login", { timeout: 15000 });
}

async function expectFlash(page, text) {
  const banner = page.locator("text=" + text).first();
  await banner.waitFor({ state: "visible", timeout: 15000 });
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  try {
    const invalidContext = await browser.newContext();
    const invalidPage = await invalidContext.newPage();
    await invalidPage.goto(`${baseUrl}/login`);
    await invalidPage.locator('input[name="email"]').fill("admin@example.com");
    await invalidPage.locator('input[name="password"]').fill("wrong-password");
    await invalidPage.getByRole("button", { name: "Sign in" }).click();
    await invalidPage.getByText("Invalid email or password").waitFor({ state: "visible", timeout: 15000 });
    await invalidContext.close();

    const viewerContext = await browser.newContext();
    const viewerPage = await viewerContext.newPage();
    await login(viewerPage, "viewer@example.com", "Admin@12345");
    await viewerPage.getByRole("heading", { name: "Attendance Dashboard" }).waitFor({ state: "visible", timeout: 15000 });
    assert.equal(await viewerPage.getByRole("link", { name: "Operations" }).count(), 0);
    assert.equal(await viewerPage.getByRole("link", { name: "Settings" }).count(), 0);
    await viewerPage.goto(`${baseUrl}/operations`);
    await viewerPage.waitForURL("**/dashboard?flash=*", { timeout: 15000 });
    await expectFlash(viewerPage, "You do not have access to that page");
    await viewerPage.goto(`${baseUrl}/settings`);
    await viewerPage.waitForURL("**/dashboard?flash=*", { timeout: 15000 });
    await expectFlash(viewerPage, "You do not have access to that page");
    await signOut(viewerPage);
    await viewerContext.close();

    const managerContext = await browser.newContext();
    const managerPage = await managerContext.newPage();
    await login(managerPage, "manager@example.com", "Admin@12345");
    await managerPage.getByRole("link", { name: "Operations" }).waitFor({ state: "visible", timeout: 15000 });
    assert.equal(await managerPage.getByRole("link", { name: "Settings" }).count(), 0);
    await managerPage.goto(`${baseUrl}/operations`);
    await managerPage.getByRole("heading", { name: "Workflow Center" }).waitFor({ state: "visible", timeout: 15000 });
    await managerPage.goto(`${baseUrl}/operations/enrollment/direct`);
    await managerPage.waitForURL("**/dashboard?flash=*", { timeout: 15000 });
    await expectFlash(managerPage, "You do not have access to that page");
    await signOut(managerPage);
    await managerContext.close();

    const hrContext = await browser.newContext();
    const hrPage = await hrContext.newPage();
    await login(hrPage, "hr@example.com", "Admin@12345");
    await hrPage.getByRole("link", { name: "Settings" }).waitFor({ state: "visible", timeout: 15000 });
    await hrPage.goto(`${baseUrl}/employees/new`);
    await hrPage.getByRole("heading", { name: "Add Employee" }).waitFor({ state: "visible", timeout: 15000 });
    await hrPage.locator('input[name="employeeNo"]').fill("EMP-001");
    await hrPage.locator('input[name="rfidUid"]').fill("46 14 33 07");
    await hrPage.locator('input[name="firstName"]').fill("Duplicate");
    await hrPage.locator('input[name="lastName"]').fill("Person");
    await hrPage.getByRole("button", { name: "Create employee" }).click();
    await hrPage.waitForURL("**/employees?flash=*", { timeout: 15000 });
    await expectFlash(hrPage, "An employee with that number, email, or RFID already exists.");
    await signOut(hrPage);
    await hrContext.close();

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await login(adminPage, "admin@example.com", "Admin@12345");
    await adminPage.getByRole("link", { name: "Settings" }).waitFor({ state: "visible", timeout: 15000 });
    await adminPage.goto(`${baseUrl}/settings`);
    await adminPage.getByRole("heading", { name: "Settings" }).waitFor({ state: "visible", timeout: 15000 });
    await adminPage.goto(`${baseUrl}/operations/enrollment/direct`);
    await adminPage.getByRole("heading", { name: "Direct RFID Assignment" }).waitFor({ state: "visible", timeout: 15000 });
    await signOut(adminPage);
    await adminContext.close();

    console.log("Headless auth smoke test passed.");
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
