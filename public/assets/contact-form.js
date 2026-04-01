(function () {
  if (typeof document === "undefined") return;

  const form = document.querySelector("[data-contact-form]");
  if (!(form instanceof HTMLFormElement)) return;

  const submitButton = form.querySelector("[data-contact-submit]");
  const status = form.querySelector("[data-contact-status]");
  if (!(submitButton instanceof HTMLButtonElement) || !(status instanceof HTMLElement)) return;

  const getValue = (name) => {
    const value = new FormData(form).get(name);
    return typeof value === "string" ? value.trim() : "";
  };

  const getRecipient = () => `${window.SITE_CONFIG?.CONTACT_EMAIL || ""}`.trim();

  const setStatus = (message, state) => {
    status.hidden = !message;
    status.textContent = message;
    if (message && state) {
      status.dataset.state = state;
      return;
    }
    delete status.dataset.state;
  };

  const updateSubmitState = () => {
    submitButton.disabled = !form.checkValidity();
    if (form.checkValidity()) {
      setStatus("", "");
    }
  };

  form.addEventListener("input", updateSubmitState);
  form.addEventListener("change", updateSubmitState);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      setStatus("", "");
      form.reportValidity();
      updateSubmitState();
      return;
    }

    const recipient = getRecipient();
    if (!recipient) {
      setStatus(
        "送信先メールアドレスが未設定です。public/assets/site-config.js の CONTACT_EMAIL を設定してください。",
        "error"
      );
      return;
    }

    const kind = getValue("kind");
    const name = getValue("name");
    const email = getValue("email");
    const message = getValue("message");
    const brandName = `${window.SITE_CONFIG?.BRAND_NAME || document.title}`.trim();
    const subject = `[お問い合わせ] ${kind} / ${name}`;
    const body = [
      `サイト名: ${brandName}`,
      `種別: ${kind}`,
      `お名前: ${name}`,
      `メールアドレス: ${email}`,
      "",
      "本文:",
      message,
      "",
      `送信元ページ: ${window.location.href}`,
    ].join("\n");
    const query = new URLSearchParams({ subject, body }).toString();

    setStatus("メールアプリを起動します。内容を確認して送信してください。", "success");
    window.location.href = `mailto:${recipient}?${query}`;
  });

  updateSubmitState();
})();
