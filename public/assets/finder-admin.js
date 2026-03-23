(function (root, factory) {
  root.FinderAdmin = factory(root.FinderStore, root.FinderCore);
})(typeof globalThis !== "undefined" ? globalThis : this, function (store, core) {
  if (!store || !core) return {};

  const statusLabels = {
    published: "公開",
    draft: "下書き",
    hold: "保留",
    excluded: "除外",
  };

  const createCheckbox = ({ id, label, checked, name }) => {
    const wrapper = document.createElement("label");
    const input = document.createElement("input");
    const text = document.createElement("span");
    wrapper.className = "choice";
    input.type = "checkbox";
    input.name = name;
    input.value = id;
    input.checked = Boolean(checked);
    text.textContent = label;
    wrapper.append(input, text);
    return wrapper;
  };

  const getCheckedValues = (root, selector) =>
    Array.from(root.querySelectorAll(selector))
      .filter((input) => input.checked)
      .map((input) => input.value);

  const downloadJson = (filename, content) => {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const init = () => {
    const root = document.querySelector("[data-admin-app]");
    if (!root) return;

    const workSearch = root.querySelector("[data-admin-work-search]");
    const workStatusFilter = root.querySelector("[data-admin-work-status-filter]");
    const workProfileFilter = root.querySelector("[data-admin-work-profile-filter]");
    const worksBody = root.querySelector("[data-admin-works-body]");
    const duplicateSummary = root.querySelector("[data-admin-duplicate-summary]");
    const worksCount = root.querySelector("[data-admin-works-count]");
    const selectAllVisible = root.querySelector("[data-admin-select-all-visible]");
    const clearSelection = root.querySelector("[data-admin-clear-selection]");
    const bulkStatus = root.querySelector("[data-admin-bulk-status]");
    const bulkTag = root.querySelector("[data-admin-bulk-tag]");
    const applyBulkStatus = root.querySelector("[data-admin-apply-bulk-status]");
    const applyBulkTagAdd = root.querySelector("[data-admin-apply-bulk-tag-add]");
    const applyBulkTagRemove = root.querySelector("[data-admin-apply-bulk-tag-remove]");
    const newWorkButton = root.querySelector("[data-admin-work-new]");
    const workForm = root.querySelector("[data-admin-work-form]");
    const workTagChecks = root.querySelector("[data-admin-work-tag-checks]");
    const workProfileChecks = root.querySelector("[data-admin-work-profile-checks]");
    const workMessage = root.querySelector("[data-admin-work-message]");
    const tagTableBody = root.querySelector("[data-admin-tags-body]");
    const tagForm = root.querySelector("[data-admin-tag-form]");
    const tagMessage = root.querySelector("[data-admin-tag-message]");
    const tagGroupSelect = root.querySelector("[data-admin-tag-group]");
    const settingsForm = root.querySelector("[data-admin-settings-form]");
    const activeProfileSelect = root.querySelector("[data-admin-active-profile]");
    const settingsGroups = root.querySelector("[data-admin-settings-groups]");
    const statsRoot = root.querySelector("[data-admin-stats]");
    const topSearchesRoot = root.querySelector("[data-admin-top-searches]");
    const recentEventsRoot = root.querySelector("[data-admin-recent-events]");
    const exportButton = root.querySelector("[data-admin-export]");
    const resetButton = root.querySelector("[data-admin-reset]");
    const clearLogsButton = root.querySelector("[data-admin-clear-logs]");

    const selectedIds = new Set();
    let state = store.loadState();

    const fillProfileOptions = () => {
      const profiles = core.ensureArray(state.siteProfiles);
      if (workProfileFilter) {
        workProfileFilter.innerHTML = '<option value="">全プロファイル</option>';
        profiles.forEach((profile) => {
          const option = document.createElement("option");
          option.value = profile.id;
          option.textContent = profile.name;
          workProfileFilter.appendChild(option);
        });
      }

      if (activeProfileSelect) {
        activeProfileSelect.textContent = "";
        profiles.forEach((profile) => {
          const option = document.createElement("option");
          option.value = profile.id;
          option.textContent = profile.name;
          option.selected = profile.id === state.activeProfileId;
          activeProfileSelect.appendChild(option);
        });
      }
    };

    const fillTagOptions = () => {
      if (bulkTag) {
        bulkTag.innerHTML = '<option value="">タグを選択</option>';
        state.tags.forEach((tag) => {
          const option = document.createElement("option");
          option.value = tag.id;
          option.textContent = tag.label;
          bulkTag.appendChild(option);
        });
      }

      if (tagGroupSelect) {
        tagGroupSelect.innerHTML = "";
        state.tagGroups.forEach((group) => {
          const option = document.createElement("option");
          option.value = group.id;
          option.textContent = group.label;
          tagGroupSelect.appendChild(option);
        });
      }
    };

    const renderWorkChecks = (formData = {}) => {
      if (workTagChecks) {
        workTagChecks.textContent = "";
        state.tags.forEach((tag) => {
          workTagChecks.appendChild(
            createCheckbox({
              id: tag.id,
              label: tag.label,
              checked: core.ensureArray(formData.tagIds).includes(tag.id),
              name: "tagIds",
            })
          );
        });
      }

      if (workProfileChecks) {
        workProfileChecks.textContent = "";
        state.siteProfiles.forEach((profile) => {
          workProfileChecks.appendChild(
            createCheckbox({
              id: profile.id,
              label: profile.shortName || profile.name,
              checked:
                core.ensureArray(formData.siteProfileIds).includes(profile.id) ||
                (!formData.id && profile.id === state.activeProfileId),
              name: "siteProfileIds",
            })
          );
        });
      }
    };

    const getVisibleWorks = () => {
      const query = core.normalizeText(workSearch?.value || "");
      const status = workStatusFilter?.value || "";
      const profileId = workProfileFilter?.value || "";
      return core.ensureArray(state.works).filter((work) => {
        if (status && work.status !== status) return false;
        if (profileId && !core.ensureArray(work.siteProfileIds).includes(profileId)) return false;
        if (!query) return true;
        const tagLabels = core
          .ensureArray(work.tagIds)
          .map((tagId) => state.tags.find((tag) => tag.id === tagId)?.label || "")
          .join(" ");
        const haystack = core.normalizeText(
          [work.title, work.shortDescription, work.publicNote, work.internalNote, tagLabels].join(" ")
        );
        return haystack.includes(query);
      });
    };

    const renderStats = () => {
      if (!statsRoot) return;
      const summary = core.aggregateLogs(state);
      const statusCounts = core.ensureArray(state.works).reduce((accumulator, work) => {
        accumulator[work.status] = (accumulator[work.status] || 0) + 1;
        return accumulator;
      }, {});
      const items = [
        { label: "公開作品", value: statusCounts.published || 0 },
        { label: "保留 / 下書き", value: (statusCounts.hold || 0) + (statusCounts.draft || 0) },
        { label: "検索ログ", value: summary.counts.search },
        { label: "0件検索", value: summary.counts.zeroSearch },
        { label: "詳細閲覧", value: summary.counts.detailView },
        { label: "外部クリック", value: summary.counts.outboundClick },
      ];
      statsRoot.textContent = "";
      items.forEach((item) => {
        const card = document.createElement("div");
        const title = document.createElement("p");
        const value = document.createElement("p");
        card.className = "card stack";
        title.className = "help";
        title.textContent = item.label;
        value.className = "admin-stat__value";
        value.textContent = String(item.value);
        card.append(title, value);
        statsRoot.appendChild(card);
      });
    };

    const renderLogs = () => {
      const summary = core.aggregateLogs(state);
      if (topSearchesRoot) {
        topSearchesRoot.textContent = "";
        summary.topSearches.forEach((item) => {
          const row = document.createElement("li");
          const parts = [];
          if (item.query) parts.push(`キーワード: ${item.query}`);
          if (item.includeLabels.length) parts.push(`含める: ${item.includeLabels.join(" / ")}`);
          if (item.excludeLabels.length) parts.push(`除外: ${item.excludeLabels.join(" / ")}`);
          row.textContent = `${parts.join(" | ") || "条件なし"} (${item.count}回 / 0件 ${item.zeroCount}回)`;
          topSearchesRoot.appendChild(row);
        });
        if (!topSearchesRoot.childElementCount) {
          const row = document.createElement("li");
          row.textContent = "まだログはありません。";
          topSearchesRoot.appendChild(row);
        }
      }

      if (recentEventsRoot) {
        recentEventsRoot.textContent = "";
        summary.recentEvents.forEach((event) => {
          const row = document.createElement("li");
          if (event.kind === "search") {
            row.textContent = `${event.createdAt.slice(0, 16).replace("T", " ")} | search | ${
              event.includeLabels.join(" / ") || event.query || "条件なし"
            } | ${event.resultCount}件`;
          } else {
            row.textContent = `${event.createdAt.slice(0, 16).replace("T", " ")} | ${event.kind} | ${
              event.workTitle || event.href || ""
            }`;
          }
          recentEventsRoot.appendChild(row);
        });
        if (!recentEventsRoot.childElementCount) {
          const row = document.createElement("li");
          row.textContent = "まだログはありません。";
          recentEventsRoot.appendChild(row);
        }
      }
    };

    const resetWorkForm = (work = null) => {
      if (!workForm) return;
      workForm.reset();
      workForm.elements.id.value = work?.id || "";
      workForm.elements.title.value = work?.title || "";
      workForm.elements.slug.value = work?.slug || "";
      workForm.elements.status.value = work?.status || "draft";
      workForm.elements.shortDescription.value = work?.shortDescription || "";
      workForm.elements.publicNote.value = work?.publicNote || "";
      workForm.elements.internalNote.value = work?.internalNote || "";
      workForm.elements.releasedAt.value = work?.releasedAt || "";
      workForm.elements.priority.value = `${work?.priority ?? 999}`;
      workForm.elements.externalLabel.value = work?.externalLinks?.[0]?.label || "DMMで作品を見る";
      workForm.elements.externalPartner.value = work?.externalLinks?.[0]?.partner || "DMM";
      workForm.elements.externalUrl.value = work?.externalLinks?.[0]?.url || "";
      renderWorkChecks(work || {});
      if (workMessage) workMessage.textContent = work ? `編集中: ${work.title}` : "新規作品を入力します。";
    };

    const renderWorks = () => {
      if (!worksBody) return;
      const visibleWorks = getVisibleWorks();
      const duplicateMap = core.detectDuplicateWorks(state.works);
      worksBody.textContent = "";
      visibleWorks.forEach((work) => {
        const row = document.createElement("tr");
        const selectCell = document.createElement("td");
        const titleCell = document.createElement("td");
        const statusCell = document.createElement("td");
        const profileCell = document.createElement("td");
        const tagsCell = document.createElement("td");
        const actionCell = document.createElement("td");
        const checkbox = document.createElement("input");
        const editButton = document.createElement("button");

        checkbox.type = "checkbox";
        checkbox.checked = selectedIds.has(work.id);
        checkbox.dataset.selectWorkId = work.id;
        selectCell.appendChild(checkbox);

        const title = document.createElement("strong");
        title.textContent = work.title;
        titleCell.appendChild(title);
        if (duplicateMap.has(work.id)) {
          const note = document.createElement("p");
          note.className = "help";
          note.textContent = duplicateMap.get(work.id).join(" / ");
          titleCell.appendChild(note);
        }

        const statusBadge = document.createElement("span");
        statusBadge.className = `status-badge status-badge--${work.status}`;
        statusBadge.textContent = statusLabels[work.status] || work.status;
        statusCell.appendChild(statusBadge);

        profileCell.textContent = core
          .ensureArray(work.siteProfileIds)
          .map((profileId) => state.siteProfiles.find((profile) => profile.id === profileId)?.shortName || profileId)
          .join(", ");

        tagsCell.textContent = core
          .ensureArray(work.tagIds)
          .slice(0, 4)
          .map((tagId) => state.tags.find((tag) => tag.id === tagId)?.label || tagId)
          .join(", ");

        editButton.type = "button";
        editButton.className = "btn btn--secondary btn--sm";
        editButton.dataset.editWorkId = work.id;
        editButton.textContent = "編集";
        actionCell.appendChild(editButton);

        row.append(selectCell, titleCell, statusCell, profileCell, tagsCell, actionCell);
        worksBody.appendChild(row);
      });

      if (worksCount) {
        worksCount.textContent = `${visibleWorks.length}件表示 / 選択 ${selectedIds.size}件`;
      }
      if (duplicateSummary) {
        const duplicateCount = Array.from(duplicateMap.keys()).length;
        duplicateSummary.textContent = duplicateCount
          ? `${duplicateCount}件に重複候補があります。タイトル一致または外部URL一致を確認してください。`
          : "重複候補は見つかっていません。";
      }
    };

    const renderTags = () => {
      if (!tagTableBody) return;
      tagTableBody.textContent = "";
      state.tags.forEach((tag) => {
        const usage = state.works.filter((work) => core.ensureArray(work.tagIds).includes(tag.id)).length;
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${tag.label}</td>
          <td>${state.tagGroups.find((group) => group.id === tag.groupId)?.label || tag.groupId}</td>
          <td>${tag.isPublic ? "公開" : "非公開"}</td>
          <td>${usage}</td>
          <td><button class="btn btn--secondary btn--sm" type="button" data-edit-tag-id="${tag.id}">編集</button></td>
        `;
        tagTableBody.appendChild(row);
      });
    };

    const resetTagForm = (tag = null) => {
      if (!tagForm) return;
      tagForm.reset();
      tagForm.elements.id.value = tag?.id || "";
      tagForm.elements.label.value = tag?.label || "";
      tagForm.elements.groupId.value = tag?.groupId || state.tagGroups[0]?.id || "";
      tagForm.elements.synonyms.value = core.ensureArray(tag?.synonyms).join(", ");
      tagForm.elements.isPublic.checked = tag ? tag.isPublic !== false : true;
      if (tagMessage) tagMessage.textContent = tag ? `編集中: ${tag.label}` : "タグを追加または編集します。";
    };

    const renderSettings = () => {
      const profile = core.getActiveProfile(state);
      if (!profile || !settingsForm) return;
      settingsForm.elements.id.value = profile.id;
      settingsForm.elements.slug.value = profile.slug || "";
      settingsForm.elements.name.value = profile.name || "";
      settingsForm.elements.shortName.value = profile.shortName || "";
      settingsForm.elements.heroTitle.value = profile.heroTitle || "";
      settingsForm.elements.heroDescription.value = profile.heroDescription || "";
      settingsForm.elements.searchPlaceholder.value = profile.searchPlaceholder || "";
      if (settingsGroups) {
        settingsGroups.textContent = "";
        state.tagGroups.forEach((group) => {
          settingsGroups.appendChild(
            createCheckbox({
              id: group.id,
              label: group.label,
              checked: core.ensureArray(profile.visibleTagGroupIds).includes(group.id),
              name: "visibleTagGroupIds",
            })
          );
        });
      }
    };

    const refresh = () => {
      state = store.loadState();
      fillProfileOptions();
      fillTagOptions();
      renderWorks();
      renderTags();
      renderStats();
      renderLogs();
      renderSettings();
      renderWorkChecks(
        workForm?.elements.id.value
          ? state.works.find((work) => work.id === workForm.elements.id.value) || {}
          : {}
      );
    };

    fillProfileOptions();
    fillTagOptions();
    resetWorkForm();
    resetTagForm();
    refresh();

    workSearch?.addEventListener("input", renderWorks);
    workStatusFilter?.addEventListener("change", renderWorks);
    workProfileFilter?.addEventListener("change", renderWorks);

    selectAllVisible?.addEventListener("click", () => {
      getVisibleWorks().forEach((work) => selectedIds.add(work.id));
      renderWorks();
    });

    clearSelection?.addEventListener("click", () => {
      selectedIds.clear();
      renderWorks();
    });

    applyBulkStatus?.addEventListener("click", () => {
      if (!selectedIds.size || !bulkStatus?.value) return;
      store.bulkUpdateWorks({ ids: Array.from(selectedIds), status: bulkStatus.value });
      refresh();
    });

    applyBulkTagAdd?.addEventListener("click", () => {
      if (!selectedIds.size || !bulkTag?.value) return;
      store.bulkUpdateWorks({ ids: Array.from(selectedIds), addTagId: bulkTag.value });
      refresh();
    });

    applyBulkTagRemove?.addEventListener("click", () => {
      if (!selectedIds.size || !bulkTag?.value) return;
      store.bulkUpdateWorks({ ids: Array.from(selectedIds), removeTagId: bulkTag.value });
      refresh();
    });

    newWorkButton?.addEventListener("click", () => resetWorkForm());

    workForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      store.upsertWork({
        id: workForm.elements.id.value,
        title: workForm.elements.title.value,
        slug: workForm.elements.slug.value,
        status: workForm.elements.status.value,
        shortDescription: workForm.elements.shortDescription.value,
        publicNote: workForm.elements.publicNote.value,
        internalNote: workForm.elements.internalNote.value,
        releasedAt: workForm.elements.releasedAt.value,
        priority: workForm.elements.priority.value,
        externalLabel: workForm.elements.externalLabel.value,
        externalPartner: workForm.elements.externalPartner.value,
        externalUrl: workForm.elements.externalUrl.value,
        siteProfileIds: getCheckedValues(workForm, 'input[name="siteProfileIds"]'),
        tagIds: getCheckedValues(workForm, 'input[name="tagIds"]'),
        primaryTagIds: getCheckedValues(workForm, 'input[name="tagIds"]').slice(0, 4),
      });
      resetWorkForm();
      refresh();
    });

    tagForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      store.upsertTag({
        id: tagForm.elements.id.value,
        label: tagForm.elements.label.value,
        groupId: tagForm.elements.groupId.value,
        isPublic: tagForm.elements.isPublic.checked,
        synonyms: tagForm.elements.synonyms.value
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      });
      resetTagForm();
      refresh();
    });

    tagForm?.querySelector("[data-admin-tag-delete]")?.addEventListener("click", () => {
      const tagId = tagForm.elements.id.value;
      if (!tagId) return;
      store.deleteTag(tagId);
      resetTagForm();
      refresh();
    });

    settingsForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      store.setActiveProfile(activeProfileSelect?.value || state.activeProfileId);
      store.upsertSiteProfile({
        id: settingsForm.elements.id.value,
        slug: settingsForm.elements.slug.value,
        name: settingsForm.elements.name.value,
        shortName: settingsForm.elements.shortName.value,
        heroTitle: settingsForm.elements.heroTitle.value,
        heroDescription: settingsForm.elements.heroDescription.value,
        searchPlaceholder: settingsForm.elements.searchPlaceholder.value,
        visibleTagGroupIds: getCheckedValues(settingsForm, 'input[name="visibleTagGroupIds"]'),
      });
      refresh();
    });

    activeProfileSelect?.addEventListener("change", () => {
      store.setActiveProfile(activeProfileSelect.value);
      refresh();
    });

    exportButton?.addEventListener("click", () => {
      downloadJson("finder-state.json", store.exportState());
    });

    resetButton?.addEventListener("click", () => {
      if (!window.confirm("ローカルの管理状態を初期シードへ戻します。よければ続行してください。")) return;
      store.resetState();
      selectedIds.clear();
      resetWorkForm();
      resetTagForm();
      refresh();
    });

    clearLogsButton?.addEventListener("click", () => {
      store.clearLogs();
      refresh();
    });

    root.addEventListener("click", (event) => {
      const editWork = event.target.closest("[data-edit-work-id]");
      if (editWork) {
        const work = state.works.find((item) => item.id === editWork.dataset.editWorkId);
        if (work) resetWorkForm(work);
        return;
      }

      const editTag = event.target.closest("[data-edit-tag-id]");
      if (editTag) {
        const tag = state.tags.find((item) => item.id === editTag.dataset.editTagId);
        if (tag) resetTagForm(tag);
        return;
      }

      const selectInput = event.target.closest("[data-select-work-id]");
      if (selectInput) {
        if (selectInput.checked) selectedIds.add(selectInput.dataset.selectWorkId);
        else selectedIds.delete(selectInput.dataset.selectWorkId);
        renderWorks();
      }
    });
  };

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
      init();
    }
  }

  return { init };
});
