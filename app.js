(function () {
  const gate = document.getElementById("gate");
  const party = document.getElementById("party");
  const unlockForm = document.getElementById("unlock-form");
  const form = document.getElementById("redeem-form");
  const unlockAlert = document.getElementById("unlock-alert");
  const alertBox = document.getElementById("form-alert");
  const successBox = document.getElementById("success");
  const unlockBtn = document.getElementById("unlock-btn");
  const submitBtn = document.getElementById("send-btn");
  const codeInput = document.getElementById("code");
  const toggleCode = document.getElementById("toggle-code");
  const dateInput = document.getElementById("date");
  const gift = window.GIFT || {};

  let unlockedConfig = null;

  applyGiftCopy();
  setMinDate();

  toggleCode.addEventListener("click", function () {
    const hidden = codeInput.type === "password";
    codeInput.type = hidden ? "text" : "password";
    toggleCode.textContent = hidden ? "Hide" : "Show";
    toggleCode.setAttribute("aria-pressed", hidden ? "true" : "false");
  });

  unlockForm.addEventListener("submit", function (event) {
    event.preventDefault();
    void handleUnlock();
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    void handleSubmit();
  });

  function applyGiftCopy() {
    document.querySelectorAll("[data-gift]").forEach(function (el) {
      const key = el.getAttribute("data-gift");
      if (key && gift[key]) {
        el.textContent = gift[key];
      }
    });
    if (gift.title) {
      document.title = gift.title;
    }
  }

  function setMinDate() {
    const now = new Date();
    const pad = function (n) {
      return String(n).padStart(2, "0");
    };
    dateInput.min = [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
    ].join("-");
  }

  function showUnlockError(message) {
    unlockAlert.hidden = false;
    unlockAlert.textContent = message;
    gate.classList.remove("shake");
    void gate.offsetWidth;
    gate.classList.add("shake");
    unlockAlert.focus?.();
  }

  function clearUnlockError() {
    unlockAlert.hidden = true;
    unlockAlert.textContent = "";
    gate.classList.remove("shake");
  }

  function showError(message) {
    alertBox.hidden = false;
    alertBox.textContent = message;
    alertBox.focus?.();
    alertBox.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function clearError() {
    alertBox.hidden = true;
    alertBox.textContent = "";
  }

  function burstParty() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const layer = document.getElementById("confetti");
    const bits = ["🍕", "🍺", "🧀", "🎉", "🌶️", "🫒"];
    layer.replaceChildren();
    for (let i = 0; i < 26; i += 1) {
      const el = document.createElement("span");
      el.className = "confetti-bit";
      el.textContent = bits[i % bits.length];
      const angle = (Math.PI * 2 * i) / 26 + Math.random() * 0.4;
      const dist = 140 + Math.random() * 220;
      el.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      el.style.setProperty("--dy", Math.sin(angle) * dist - 40 + "px");
      el.style.setProperty("--rot", Math.random() * 720 - 360 + "deg");
      el.style.animationDelay = Math.random() * 0.12 + "s";
      layer.appendChild(el);
    }
    window.setTimeout(function () {
      layer.replaceChildren();
    }, 1800);
  }

  async function unlockConfig(passphrase) {
    const cipher = window.REDEEM_CIPHER;
    if (!cipher || typeof RedeemCrypto === "undefined") {
      return { status: "not-ready" };
    }
    try {
      const config = await RedeemCrypto.decryptJson(passphrase, cipher);
      if (!config || typeof config !== "object") {
        return { status: "wrong-code" };
      }
      return { status: "ok", config: config };
    } catch {
      return { status: "wrong-code" };
    }
  }

  function openParty(config) {
    unlockedConfig = config;
    burstParty();
    gate.hidden = true;
    party.hidden = false;
    document.getElementById("phone").focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleUnlock() {
    clearUnlockError();
    const code = codeInput.value.trim();
    if (!code) {
      showUnlockError("The card has a code. This box wants that code.");
      return;
    }

    unlockBtn.disabled = true;
    unlockBtn.textContent = gift.unlocking || "Working the combo…";

    try {
      const unlocked = await unlockConfig(code);
      if (unlocked.status === "not-ready") {
        showUnlockError(gift.notReady || "This feast isn’t wired up yet.");
        return;
      }
      if (unlocked.status !== "ok") {
        showUnlockError(gift.wrongCode || "That combo didn’t click.");
        return;
      }
      openParty(unlocked.config);
    } finally {
      if (!gate.hidden) {
        unlockBtn.disabled = false;
        unlockBtn.textContent = gift.unlock || "Crack it open";
      }
    }
  }

  function collectFields() {
    const beers = Array.from(form.querySelectorAll('input[name="beer"]:checked')).map(
      function (el) {
        return el.value;
      }
    );

    return {
      phone: document.getElementById("phone").value.trim(),
      street: document.getElementById("street").value.trim(),
      unit: document.getElementById("unit").value.trim(),
      city: document.getElementById("city").value.trim(),
      date: dateInput.value,
      timeWindow: document.getElementById("time-window").value.trim(),
      beer: beers.join(", "),
      pizza1: document.getElementById("pizza1").value.trim(),
      pizza2: document.getElementById("pizza2").value.trim(),
      notes: document.getElementById("notes").value.trim(),
      ageConfirmed: document.getElementById("age").checked,
      timestamp: new Date().toISOString(),
    };
  }

  function validate(fields) {
    if (!unlockedConfig) return "Unlock the feast with the card code first.";
    if (!fields.phone) return "I need a phone number or this pizza is just a rumor.";
    if (!fields.street) return "Street address — the pies need a door.";
    if (!fields.city) return "City — the driver needs more than a street."
    if (!fields.ageConfirmed) {
      return gift.ageHint || "A 21+ adult needs to be there for delivery.";
    }
    return "";
  }

  function line(label, value) {
    const text = String(value || "").trim();
    if (!text) return null;
    return label + ": " + text;
  }

  function formatMessage(fields) {
    return [
      "Birthday summon received",
      "Time: " + fields.timestamp,
      "",
      line("Phone", fields.phone),
      line("Street", fields.street),
      line("Unit / notes", fields.unit),
      line("City", fields.city),
      line("Preferred date", fields.date),
      line("Time window", fields.timeWindow),
      line("Beer vibe", fields.beer),
      line("Pizza 1", fields.pizza1),
      line("Pizza 2", fields.pizza2),
      line("Anything else", fields.notes),
      "21+ on site: yes",
    ]
      .filter(function (row) {
        return row !== null;
      })
      .join("\n");
  }

  function embedFields(fields) {
    const pairs = [
      ["Phone", fields.phone],
      ["Street", fields.street],
      ["Unit / notes", fields.unit],
      ["City", fields.city],
      ["Preferred date", fields.date],
      ["Time window", fields.timeWindow],
      ["Beer vibe", fields.beer],
      ["Pizza 1", fields.pizza1],
      ["Pizza 2", fields.pizza2],
      ["Anything else", fields.notes],
      ["21+ on site", "yes"],
    ];
    return pairs
      .filter(function (pair) {
        return String(pair[1] || "").trim();
      })
      .map(function (pair) {
        const name = pair[0];
        const long = name === "Anything else" || name === "Unit / notes" || name === "Street";
        return {
          name: name,
          value: String(pair[1]).slice(0, 1024),
          inline: !long,
        };
      });
  }

  function destinations(config) {
    const list = [];
    if (config.discordWebhookUrl) {
      list.push({ kind: "discord", url: String(config.discordWebhookUrl) });
    }
    if (config.telegramBotToken && config.telegramChatId) {
      list.push({
        kind: "telegram",
        token: String(config.telegramBotToken),
        chatId: String(config.telegramChatId),
      });
    }
    return list;
  }

  async function postDiscord(url, fields) {
    const payload = {
      content: "Birthday summon received — details below.",
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: "Summon received",
          color: 0xe63946,
          timestamp: fields.timestamp,
          fields: embedFields(fields),
        },
      ],
    };
    const json = JSON.stringify(payload);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: json,
      });
      if (res.ok) return;
      throw new Error("bad-status");
    } catch (err) {
      if (err && err.message === "bad-status") throw err;
      const formData = new FormData();
      formData.append("payload_json", json);
      const retry = await fetch(url, { method: "POST", body: formData, mode: "no-cors" });
      if (retry.type !== "opaque" && retry.ok === false) {
        throw new Error("bad-status");
      }
    }
  }

  async function postTelegram(token, chatId, fields) {
    const endpoint = "https://api.telegram.org/bot" + token + "/sendMessage";
    const body = new URLSearchParams({
      chat_id: chatId,
      text: formatMessage(fields),
    });

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body,
      });
      if (res.ok) return;
      throw new Error("bad-status");
    } catch (err) {
      if (err && err.message === "bad-status") throw err;
      const retry = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body,
        mode: "no-cors",
      });
      if (retry.type !== "opaque" && retry.ok === false) {
        throw new Error("bad-status");
      }
    }
  }

  async function notifyAll(config, fields) {
    const dests = destinations(config);
    if (dests.length === 0) {
      throw new Error("no-destinations");
    }

    const results = await Promise.allSettled(
      dests.map(function (dest) {
        if (dest.kind === "discord") {
          return postDiscord(dest.url, fields);
        }
        if (dest.kind === "telegram") {
          return postTelegram(dest.token, dest.chatId, fields);
        }
        return Promise.resolve();
      })
    );

    const anyOk = results.some(function (result) {
      return result.status === "fulfilled";
    });
    if (!anyOk) {
      throw new Error("notify-failed");
    }
  }

  function showSuccess() {
    form.hidden = true;
    successBox.hidden = false;
    burstParty();
    successBox.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  async function handleSubmit() {
    clearError();
    const fields = collectFields();
    const invalid = validate(fields);
    if (invalid) {
      showError(invalid);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = gift.sending || "Sprinting to the kitchen…";

    try {
      await notifyAll(unlockedConfig, fields);
      showSuccess();
    } catch {
      showError(gift.networkFail || "The ping bounced. Try again, or text me.");
    } finally {
      if (!form.hidden) {
        submitBtn.disabled = false;
        submitBtn.textContent = gift.submit || "Fire the summon";
      }
    }
  }
})();
