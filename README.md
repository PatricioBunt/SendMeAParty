# Redeem your summon

A static birthday gift page. He opens the URL from the card, types the secret code plus a delivery address, and you get an instant Discord and/or Telegram ping so you can order **72 beers + 2 large pizzas** the same day.

No backend, no database, no accounts. Host it on GitHub Pages or any static host.

## How it works

1. You run `node setup.mjs` with the card code and your webhook credentials.
2. The script encrypts a small JSON config with that code (PBKDF2-SHA-256, 210,000 iterations → AES-GCM, random salt + IV) and writes `config.js` as `window.REDEEM_CIPHER = "..."`.
3. The page starts locked: only the secret-code screen is visible. A correct code decrypts the config and unlocks the delivery form. Then submit POSTs a readable message to whichever destinations you sealed in.

Wrong code → decrypt fails → friendly error. The form stays sealed. Nothing is sent.

The same code can be used more than once. That is an accepted side effect. There is no one-time-use lock.

## Threat model (sibling gift, v1)

Anyone who knows the secret code can:

- Redeem the form (including more than once)
- Open DevTools after a successful decrypt and read the webhook URL / bot token

That is fine for a family gift. It is **not** fine for anything you would regret leaking.

Do **not** commit plaintext tokens or webhook URLs. Prefer keeping generated `config.js` out of git. If you do commit it (GitHub Pages is easiest that way), commit **ciphertext only** — never the raw Discord URL or Telegram token.

After the party, rotate or delete the Discord webhook and/or Telegram bot if you want the credential gone.

## 1. Create a Discord webhook (optional)

1. Open Discord and use a server you control (a private “gift” server is ideal).
2. Create a channel, e.g. `#birthday-summon`.
3. Channel settings → **Integrations** → **Webhooks** → **New Webhook**.
4. Name it something you’ll notice on your phone, then **Copy Webhook URL**.

It looks like `https://discord.com/api/webhooks/123…/abc…`.

Discord from a static page is the more reliable of the two channels. Use it if you only set up one destination.

## 2. Create a Telegram bot (optional)

1. In Telegram, open [@BotFather](https://t.me/BotFather) and send `/newbot`.
2. Follow the prompts. Copy the bot token (`123456789:AAH…`).
3. Start a chat with your new bot and send it any message (or add it to a private group and send a message there).
4. In a browser, open:

   `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`

5. Find `"chat":{"id": … }`. That number is `chat_id` (for groups it is often negative).

Telegram’s API often omits CORS headers and sometimes rejects browser user-agents, so a browser `fetch` may fail even when Discord works. The page still tries Telegram (including a simple form POST). If you care about a guaranteed ping, configure Discord.

## 3. Run setup

Needs [Node.js 18+](https://nodejs.org/).

```bash
copy config.example.js config.js
node setup.mjs
```

On macOS/Linux: `cp config.example.js config.js`.

Interactive prompts ask for the secret code and the destinations you want. Or pass flags:

```bash
node setup.mjs --code "THE-CARD-CODE" --discord "https://discord.com/api/webhooks/..."
```

```bash
node setup.mjs --code "THE-CARD-CODE" --telegram-token "123:ABC" --telegram-chat "987654321"
```

You can set both Discord and Telegram in one run. Omit unused flags. The script writes `config.js` with ciphertext only.

The code on the physical card **is** the decryption passphrase. Treat it like a password. It is case-sensitive.

## 4. Test with a dummy webhook

**Option A — webhook.site**

1. Open [https://webhook.site](https://webhook.site) and copy your unique URL.
2. Seal it as a stand-in Discord URL:

   ```bash
   node setup.mjs --code "test-code" --discord "https://webhook.site/your-uuid"
   ```

3. Serve the folder and redeem once:

   ```bash
   node serve.mjs
   ```

   Open `http://127.0.0.1:4173`, use `test-code`, fill the form.
4. Confirm every field plus an ISO timestamp landed on webhook.site.

**Option B — a throwaway Discord channel**

Run setup with a real test webhook, redeem, and check the ping on your phone.

**Wrong-code check:** submit with a different code. You should get a friendly error, and nothing should appear in Discord/Telegram. The error does not say which service is configured.

## 5. Deploy the static files

Upload the site files (`index.html`, `styles.css`, `gift.js`, `config.js`, `redeem-crypto.js`, `app.js`). You do not need to upload `setup.mjs`, `README.md`, or tests.

### GitHub Pages

1. Put this folder in a GitHub repo.
2. Run setup so `config.js` exists.
3. Force-add ciphertext if `config.js` is gitignored:

   ```bash
   git add -f config.js
   git add index.html styles.css gift.js redeem-crypto.js app.js
   git commit -m "Add birthday summon page"
   git push
   ```

4. Repo **Settings → Pages** → deploy from the branch root (or `/docs` if you moved the files there).
5. Print the Pages URL and the secret code on the physical card.

Any other static host (Netlify drop, Cloudflare Pages, S3, a USB stick behind a tiny web server) works the same: publish those six files.

## Customize the gift name

Edit `gift.js`. Title, button label, success copy, and error strings live there so you can rename “summon” without touching the form.

## Local preview

```bash
node serve.mjs
```

Then open `http://127.0.0.1:4173`. Opening `index.html` as a `file://` page may block `fetch`.

## What you receive

A readable message that includes:

- Phone, street, unit/notes, city
- Preferred date and time window (if given)
- Beer vibe chips, pizza 1, pizza 2, anything else
- 21+ confirmation
- ISO timestamp

## Files

| File | Role |
| --- | --- |
| `index.html` | Redeem form |
| `styles.css` | Mobile-first gift-card layout |
| `gift.js` | Display copy |
| `config.js` | Generated ciphertext (gitignored) |
| `config.example.js` | Empty placeholder |
| `redeem-crypto.js` | PBKDF2 + AES-GCM (browser + Node) |
| `app.js` | Decrypt + notify |
| `setup.mjs` | Encrypt credentials → `config.js` |
| `serve.mjs` | Tiny local static server |

`node --test` / `npm run test:crypto` runs a crypto round-trip (right code works, wrong code fails, salt/IV are random).
