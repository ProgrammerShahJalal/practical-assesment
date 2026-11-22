import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";

let server;
let baseUrl;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test("quick setup is public and can be turned off", async () => {
  const previous = process.env.DISABLE_QUICK_SETUP;
  process.env.DISABLE_QUICK_SETUP = "true";
  try {
    // No Authorization header: a visitor with no account can reach this route.
    const response = await fetch(`${baseUrl}/api/setup/quick-start`, { method: "POST" });
    assert.equal(response.status, 403);
    const body = await response.json();
    assert.match(body.error, /turned off/);
  } finally {
    if (previous === undefined) delete process.env.DISABLE_QUICK_SETUP;
    else process.env.DISABLE_QUICK_SETUP = previous;
  }
});
