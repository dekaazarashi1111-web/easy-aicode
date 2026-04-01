(function () {
  if (typeof document === "undefined") return;

  const root = document.querySelector("[data-apply-form]");
  const list = document.querySelector("[data-apply-work-list]");
  const template = document.querySelector("[data-apply-work-template]");
  const submitButton = document.querySelector("[data-apply-submit]");
  const status = document.querySelector("[data-apply-status]");
  if (
    !(root instanceof HTMLFormElement) ||
    !list ||
    !(template instanceof HTMLTemplateElement) ||
    !(submitButton instanceof HTMLButtonElement) ||
    !(status instanceof HTMLElement)
  ) {
    return;
  }

  const successMessage = "送信しました。メールアプリで内容を確認して送信してください。";

  const setStatus = (message, state) => {
    status.hidden = !message;
    status.textContent = message;
    if (message && state) {
      status.dataset.state = state;
      return;
    }
    delete status.dataset.state;
  };

  const getWorkInputs = (item) => ({
    title: item.querySelector("input[name='work_title[]']"),
    url: item.querySelector("input[name='work_url[]']"),
  });

  const updateLabels = () => {
    const items = Array.from(list.querySelectorAll("[data-apply-work-item]"));
    items.forEach((item, index) => {
      const heading = item.querySelector(".apply-work-item__header strong");
      if (heading) heading.textContent = `作品 ${index + 1}`;

      const removeButton = item.querySelector("[data-apply-remove-work]");
      if (removeButton) {
        removeButton.hidden = items.length === 1;
      }
    });
  };

  const syncWorkValidity = () => {
    const items = Array.from(list.querySelectorAll("[data-apply-work-item]"));
    items.forEach((item, index) => {
      const { title, url } = getWorkInputs(item);
      if (!(title instanceof HTMLInputElement) || !(url instanceof HTMLInputElement)) return;

      const titleValue = title.value.trim();
      const urlValue = url.value.trim();
      const isFirstItem = index === 0;
      const hasEither = Boolean(titleValue || urlValue);

      title.required = isFirstItem;
      url.required = isFirstItem;

      title.setCustomValidity("");
      url.setCustomValidity("");

      if (!isFirstItem && !hasEither) {
        return;
      }

      if (!titleValue) {
        title.setCustomValidity("作品名を入力してください。");
      }

      if (!urlValue) {
        url.setCustomValidity("作品URLを入力してください。");
      }
    });
  };

  const updateSubmitState = () => {
    syncWorkValidity();
    submitButton.disabled = !root.checkValidity();
    if (root.checkValidity()) {
      setStatus("", "");
    }
  };

  const addItem = () => {
    const fragment = template.content.cloneNode(true);
    list.appendChild(fragment);
    updateLabels();
    updateSubmitState();
    const lastTitleInput = list.querySelector(".apply-work-item:last-child input[name='work_title[]']");
    if (lastTitleInput instanceof HTMLInputElement) {
      lastTitleInput.focus();
    }
  };

  root.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-apply-add-work]");
    if (addButton) {
      addItem();
      return;
    }

    const removeButton = event.target.closest("[data-apply-remove-work]");
    if (removeButton) {
      const item = removeButton.closest("[data-apply-work-item]");
      if (item && list.querySelectorAll("[data-apply-work-item]").length > 1) {
        item.remove();
        updateLabels();
        updateSubmitState();
      }
    }
  });

  root.addEventListener("input", updateSubmitState);
  root.addEventListener("change", updateSubmitState);

  root.addEventListener("submit", (event) => {
    event.preventDefault();
    updateSubmitState();

    if (!root.checkValidity()) {
      setStatus("", "");
      root.reportValidity();
      return;
    }

    const recipient = `${window.SITE_CONFIG?.APPLY_EMAIL || window.SITE_CONFIG?.CONTACT_EMAIL || ""}`.trim();
    if (!recipient) {
      setStatus(
        "送信先メールアドレスが未設定です。public/assets/site-config.js の APPLY_EMAIL または CONTACT_EMAIL を設定してください。",
        "error"
      );
      return;
    }

    const formData = new FormData(root);
    const creatorName = `${formData.get("creator_name") || ""}`.trim();
    const snsAccount = `${formData.get("sns_account") || ""}`.trim();
    const workTitles = formData.getAll("work_title[]").map((value) => `${value || ""}`.trim());
    const workUrls = formData.getAll("work_url[]").map((value) => `${value || ""}`.trim());
    const works = workTitles
      .map((title, index) => ({ title, url: workUrls[index] || "" }))
      .filter((work) => work.title || work.url);
    const brandName = `${window.SITE_CONFIG?.BRAND_NAME || document.title}`.trim();
    const subject = `[掲載申請] ${creatorName}`;
    const workLines = works.map((work, index) => [`作品 ${index + 1}: ${work.title}`, `URL: ${work.url}`].join("\n"));
    const body = [
      `サイト名: ${brandName}`,
      `クリエイター名 / サークル名: ${creatorName}`,
      "",
      "掲載申請作品:",
      workLines.join("\n\n"),
      "",
      "SNSアカウント:",
      snsAccount,
      "",
      `送信元ページ: ${window.location.href}`,
    ].join("\n");
    const query = new URLSearchParams({ subject, body }).toString();

    setStatus(successMessage, "success");
    window.alert(successMessage);
    window.location.href = `mailto:${recipient}?${query}`;
  });

  updateLabels();
  updateSubmitState();
})();
