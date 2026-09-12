import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { encryptJson, decryptJson } = require("./redeem-crypto.js");

const passphrase = "card-code-48-pies";
const config = {
  discordWebhookUrl: "https://discord.com/api/webhooks/000/fake",
  telegramBotToken: "123456:FAKESECRET_s2t3u4v5w6x7y8z9a0b1",
  telegramChatId: "4242",
};

const cipher = await encryptJson(passphrase, config);
assert.ok(typeof cipher === "string" && cipher.length > 40);

const roundtrip = await decryptJson(passphrase, cipher);
assert.deepEqual(roundtrip, config);

await assert.rejects(() => decryptJson("wrong-code", cipher));
await assert.rejects(() => decryptJson(passphrase, "not-valid-base64???"));

const again = await encryptJson(passphrase, config);
assert.notEqual(again, cipher, "salt and IV must be random per run");

console.log("crypto roundtrip: ok");
