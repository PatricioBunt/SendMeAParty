/**
 * PBKDF2-SHA-256 + AES-GCM helpers shared by the page and setup.mjs.
 * Envelope (base64): version(1) || salt(16) || iv(12) || ciphertext+tag
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.RedeemCrypto = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const VERSION = 1;
  const SALT_LEN = 16;
  const IV_LEN = 12;
  const KEY_BITS = 256;
  const ITERATIONS = 210000;

  function subtle() {
    const c = globalThis.crypto;
    if (!c || !c.subtle) {
      throw new Error("Web Crypto is not available");
    }
    return c.subtle;
  }

  function bytesToBase64(bytes) {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(bytes).toString("base64");
    }
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  function base64ToBytes(value) {
    if (typeof Buffer !== "undefined") {
      return new Uint8Array(Buffer.from(value, "base64"));
    }
    const bin = atob(value);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) {
      out[i] = bin.charCodeAt(i);
    }
    return out;
  }

  async function importPassphrase(passphrase) {
    return subtle().importKey(
      "raw",
      new TextEncoder().encode(passphrase),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
  }

  async function deriveKey(passphrase, salt) {
    const baseKey = await importPassphrase(passphrase);
    return subtle().deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: ITERATIONS,
        hash: "SHA-256",
      },
      baseKey,
      { name: "AES-GCM", length: KEY_BITS },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptJson(passphrase, data) {
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_LEN));
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_LEN));
    const key = await deriveKey(passphrase, salt);
    const plaintext = new TextEncoder().encode(JSON.stringify(data));
    const ciphertext = new Uint8Array(
      await subtle().encrypt({ name: "AES-GCM", iv }, key, plaintext)
    );

    const packed = new Uint8Array(1 + SALT_LEN + IV_LEN + ciphertext.length);
    packed[0] = VERSION;
    packed.set(salt, 1);
    packed.set(iv, 1 + SALT_LEN);
    packed.set(ciphertext, 1 + SALT_LEN + IV_LEN);
    return bytesToBase64(packed);
  }

  async function decryptJson(passphrase, envelope) {
    const packed = base64ToBytes(envelope);
    const min = 1 + SALT_LEN + IV_LEN + 16;
    if (packed.length < min || packed[0] !== VERSION) {
      throw new Error("bad-envelope");
    }

    const salt = packed.subarray(1, 1 + SALT_LEN);
    const iv = packed.subarray(1 + SALT_LEN, 1 + SALT_LEN + IV_LEN);
    const ciphertext = packed.subarray(1 + SALT_LEN + IV_LEN);
    const key = await deriveKey(passphrase, salt);
    const plaintext = await subtle().decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    return JSON.parse(new TextDecoder().decode(plaintext));
  }

  return {
    VERSION,
    SALT_LEN,
    IV_LEN,
    ITERATIONS,
    encryptJson,
    decryptJson,
  };
});
