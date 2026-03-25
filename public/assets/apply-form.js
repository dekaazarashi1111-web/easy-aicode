(function () {
  if (typeof document === "undefined") return;

  const root = document.querySelector("[data-apply-form]");
  const list = document.querySelector("[data-apply-work-list]");
  const template = document.querySelector("[data-apply-work-template]");
  if (!root || !list || !(template instanceof HTMLTemplateElement)) return;

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

  const addItem = () => {
    const fragment = template.content.cloneNode(true);
    list.appendChild(fragment);
    updateLabels();
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
      }
    }
  });

  updateLabels();
})();
