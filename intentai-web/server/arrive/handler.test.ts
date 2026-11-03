import { expect, test } from "vitest";
import { handleArrive, readRequest } from "./handler.js";

const good = { image: { mediaType: "image/jpeg", data: "QUJD" }, place: { name: "Bussorah Street", address: "Kampong Gelam", look: "shophouses" } };

test("an arrival photo needs an image and the place's name", () => {
  expect(readRequest(good)).toMatchObject({ place: { name: "Bussorah Street" } });
  expect(readRequest({ ...good, image: { mediaType: "image/gif", data: "QUJD" } })).toBeNull();
  expect(readRequest({ ...good, image: { mediaType: "image/jpeg", data: "not base64!" } })).toBeNull();
  expect(readRequest({ ...good, place: { name: "  " } })).toBeNull();
});

test("without a key the check says it is not configured, so the game checks in on the player's word", async () => {
  const res = await handleArrive(new Request("http://x/api/arrive", { method: "POST", body: JSON.stringify(good) }), undefined);
  expect(res.status).toBe(503);
  expect(await res.json()).toEqual({ error: "not_configured" });
});
