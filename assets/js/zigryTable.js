function zigryTable(tableId, baseUrl, options = {}) {
  const {
    fields = [],
    title = null,
    theadTitles = {},
    theadWidths = {},
    sortable = [],
    limits = [10, 25, 50, 100, 200],
    defaultLimit = 10,
    actions = null,
    classMap = {},
    inlineEditable = [],
    bulkDeleteUrl = `${baseUrl}delete`,
    bulkDeleteMapper = "id",
    formatters = {},
    filterButtons = [],
    gridStyles = ["card", "compact", "image-left"],
    defaultGridStyle = "card",
    defaultView = "table",
    toolbar = {},
    infiniteScroll = false,
    infiniteScrollThreshold = 120,
    infiniteScrollDebounce = 200,
    itemLink = null, // Field name containing the URL to navigate to when clicking an item
  } = options;

  const resolveMapper =
    typeof bulkDeleteMapper === "function"
      ? bulkDeleteMapper
      : (row) => row[bulkDeleteMapper] ?? row.id;
  let currentItems = []; // ?? Cache the fetched items
  let currentFilters = {};
  let cbMaster;
  let headers = [],
    currentPage = 1,
    lastPage = 1,
    currentSearch = "",
    currentSort = [],
    currentOrder = [],
    currentLimit = defaultLimit;
  const tableElement = document.getElementById(tableId);
  let searchInput,
    paginationContainer,
    tbody,
    limitSelect,
    gridContainer,
    listContainer,
    isMobile = window.innerWidth < 768;
  let tableWrapper;
  let selectedIds = new Set();
  let thead;
  let hiddenColumns = new Set();
  const minColWidth = 120; // Avg width assumption

  const storageKey = `zigryTable_state_${tableId}`;
  const selectedKey = `zigryTable_selected_${tableId}`;

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    if (saved.sort) currentSort = saved.sort.split(",");
    if (saved.order) currentOrder = saved.order.split(",");
    if (saved.search) currentSearch = saved.search;
    if (saved.filters) currentFilters = saved.filters;

    if (saved.limit) currentLimit = saved.limit;
    if (saved.page) currentPage = saved.page;
    if (saved.view) currentView = saved.view;
    if (saved.gridStyle) currentGridStyle = saved.gridStyle;
  } catch {}

  // If no saved filters, seed currentFilters from baseUrl query params (e.g., ?status=draft)
  try {
    const tmp = new URL(location.origin + baseUrl);
    tmp.searchParams.forEach((v, k) => {
      if (currentFilters[k] === undefined) {
        const vals = tmp.searchParams.getAll(k);
        currentFilters[k] = vals.length > 1 ? vals : vals[0];
      }
    });
  } catch (e) {}

  try {
    const savedSel = JSON.parse(localStorage.getItem(selectedKey) || "[]");
    selectedIds = new Set(Array.isArray(savedSel) ? savedSel.map(String) : []);
  } catch {
    selectedIds = new Set();
  }

  const debounce = (fn, delay = 300) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  };

  // current view: 'table' | 'grid' | 'list'
  let currentView = defaultView || "table";
  let currentGridStyle =
    defaultGridStyle || (gridStyles && gridStyles[0]) || "card";
  let loadingMore = false;
  let scrollAttached = false;

  // Normalize toolbar settings with defaults
  const tb = Object.assign(
    {
      showSearch: true,
      showLimit: true,
      showViewToggle: true,
      showGridStyleSelector: true,
      showPagination: true,
      showFilterButtons: true,
      showBulkActions: true,
    },
    toolbar || {}
  );

  // Helper: return an image URL for an item using same heuristic as grid renderer
  const getImageForItem = (item) => {
    try {
      const imgFields = [headers[0], headers[1]].filter(Boolean);
      for (let f of imgFields) {
        const v = item && item[f];
        if (!v) continue;
        if (
          typeof v === "string" &&
          (v.match(/^https?:\/\//) ||
            v.match(/\.(png|jpe?g|webp|svg)(\?.*)?$/i))
        ) {
          return v;
        }
      }
    } catch (e) {}
    return null;
  };

  // Helper: detect image-like values (absolute/relative paths or data URIs)
  const isImageLike = (v) => {
    if (!v) return false;
    if (typeof v !== "string") return false;
    return (
      !!v.match(
        /(^\/|https?:\/\/|^data:image\/).*\.(png|jpe?g|webp|svg)(\?.*)?$/i
      ) || !!v.match(/^data:image\//i)
    );
  };

  // Helpers for sort arrow SVGs
  const createArrowSVG = (direction) => {
    if (direction === "asc") {
      return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 14l5-5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    if (direction === "desc") {
      return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    return "";
  };

  const setArrowSVG = (el, direction, visible) => {
    try {
      el.innerHTML = visible ? createArrowSVG(direction) : "";
      el.style.opacity = visible ? "1" : "0.4";
    } catch (e) {
      el.textContent = visible ? (direction === "asc" ? "↑" : "↓") : "";
    }
  };

  // Public helper to get image path: accepts an item object or an id/string
  window[`${tableId}_getImage`] = (input) => {
    if (!input) return null;
    if (typeof input === "object") return getImageForItem(input) || null;
    const id = String(input);
    const found = (currentItems || []).find(
      (it) => String(resolveMapper(it)) === id || String(it.id) === id
    );
    return found ? getImageForItem(found) || null : null;
  };

  const saveState = () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        search: currentSearch,
        sort: currentSort.join(","),
        order: currentOrder.join(","),
        limit: currentLimit,
        page: currentPage,
        view: currentView,
        gridStyle: currentGridStyle,
        filters: currentFilters,
      })
    );
    localStorage.setItem(selectedKey, JSON.stringify(Array.from(selectedIds)));
  };

  // Fetch a page and optionally append items
  function fetchPage(page = currentPage, append = false) {
    loadingMore = true;
    return fetchData(page)
      .then((json) => {
        // merge or replace items
        const items = json.items || [];
        if (append) {
          currentItems = Array.isArray(currentItems)
            ? currentItems.concat(items)
            : items;
        } else {
          currentItems = items;
        }
        currentPage = json.currentPage || page;
        lastPage = json.lastPage || lastPage;
        renderTable(json);
        saveState();
        loadingMore = false;
        return json;
      })
      .catch((e) => {
        loadingMore = false;
        throw e;
      });
  }

  const buildUrl = (page) => {
    // Use the provided baseUrl (may include existing query params) and manipulate
    // its searchParams instead of naively concatenating `page` into the path
    // (which caused `...?status=all` + 1 => `status=all1`).
    const u = new URL(location.origin + baseUrl);
    const p = u.searchParams;

    // ensure page is set explicitly
    p.set("page", page);

    if (currentSearch) p.set("search", currentSearch);

    if (currentSort?.length) {
      const uniqueSort = [...new Set(currentSort)];
      const uniqueOrder = currentOrder?.slice(0, uniqueSort.length) || [];

      p.set("sort", uniqueSort.join(","));
      p.set("order", uniqueOrder.join(","));
    }

    if (currentLimit) p.set("limit", currentLimit);

    // include filters
    try {
      Object.keys(currentFilters || {}).forEach((k) => {
        const v = currentFilters[k];
        if (v === null || typeof v === "undefined" || v === "") return;
        if (Array.isArray(v)) {
          // set multiple values for same key
          p.delete(k);
          v.forEach((val) => p.append(k, String(val)));
        } else {
          p.set(k, String(v));
        }
      });
    } catch (e) {}

    return u.pathname + "?" + p.toString();
  };

  // Helper: normalize a button definition and create element
  const createFilterButton = (def) => {
    const { key, value, label, icon, multi } = def;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm btn-outline-light";
    btn.style.borderRadius = "6px";
    btn.setAttribute("data-table", tableId);
    btn.setAttribute("data-filter-key", key);
    // serialize value for storage in attribute; null means clear
    btn.setAttribute(
      "data-filter-value",
      typeof value === "string" ? value : JSON.stringify(value)
    );
    if (multi) btn.setAttribute("data-filter-multi", "true");
    btn.innerHTML = `${icon ? `<i class="${icon}"></i> ` : ""}${
      label || (Array.isArray(value) ? value.join(",") : value)
    }`;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const k = btn.getAttribute("data-filter-key");
      let v = btn.getAttribute("data-filter-value");
      try {
        v = JSON.parse(v);
      } catch (_) {}

      // special: value === 'all' or null clears filter
      if (v === "all" || v === null) {
        window[`${tableId}_clearFilter`](k);
        return;
      }

      const isMulti =
        btn.getAttribute("data-filter-multi") === "true" || Array.isArray(v);
      if (isMulti) {
        const cur = Array.isArray(currentFilters[k])
          ? [...currentFilters[k]]
          : [];
        const val = Array.isArray(v) ? v[0] : v; // button represents single value in multi mode
        const idx = cur.indexOf(val);
        if (idx === -1) cur.push(val);
        else cur.splice(idx, 1);
        if (!cur.length) window[`${tableId}_clearFilter`](k);
        else window[`${tableId}_setFilter`](k, cur);
      } else {
        // toggle behavior for single value
        if (JSON.stringify(currentFilters[k]) === JSON.stringify(v)) {
          window[`${tableId}_clearFilter`](k);
        } else {
          window[`${tableId}_setFilter`](k, v);
        }
      }
    });

    // mark as bound so bindFilterButtons won't attach duplicate handlers
    btn.setAttribute("data-filter-bound", "1");

    return btn;
  };

  const renderFilterButtons = (buttons, targetElement) => {
    try {
      if (!buttons || !buttons.length) return;
      const nodes = buttons.map((b) => createFilterButton(b));
      // place buttons to the left area if available, otherwise before tableElement
      const p = tableElement.parentElement;
      const container = document.createElement("div");
      container.className = "d-flex gap-2 align-items-center me-3";
      container.id = `${tableId}_filter_buttons`;
      container.style.display = "inline-flex";
      container.style.alignItems = "center";
      container.style.flexWrap = "wrap";
      container.style.gap = "8px";
      container.style.marginTop = "4px";
      nodes.forEach((n) => container.appendChild(n));
      // If caller supplied a target element (e.g., the left controls), use it.
      if (targetElement && targetElement.appendChild) {
        // if the searchInput exists inside targetElement, insert before it so buttons are visible
        try {
          if (
            typeof searchInput !== "undefined" &&
            targetElement.contains &&
            targetElement.contains(searchInput)
          ) {
            targetElement.insertBefore(container, searchInput);
          } else {
            targetElement.appendChild(container);
          }
        } catch (err) {
          targetElement.appendChild(container);
        }
        try {
          updateFilterButtons();
        } catch (e) {}
        try {
          if (typeof replaceZigryIcons === "function") replaceZigryIcons();
        } catch (e) {}
        console.debug &&
          console.debug("zigryTable: rendered filter buttons for", tableId);
        return;
      }
      // insert container into the card header left controls if exists
      const card = p.querySelector(".card");
      const hdr = card && card.querySelector(".card-header .d-flex");
      if (hdr) {
        hdr.insertBefore(container, hdr.firstChild.nextSibling);
        try {
          updateFilterButtons();
        } catch (e) {}
      } else {
        p.insertBefore(container, p.firstChild);
        try {
          updateFilterButtons();
        } catch (e) {}
      }
    } catch (e) {}
  };

  const updateFilterButtons = () => {
    try {
      const nodes = document.querySelectorAll(
        `[data-table="${tableId}"][data-filter-key]`
      );
      nodes.forEach((n) => {
        let v = n.getAttribute("data-filter-value");
        try {
          v = JSON.parse(v);
        } catch (_) {}
        const k = n.getAttribute("data-filter-key");
        const filters = currentFilters || {};
        const isMulti =
          n.getAttribute("data-filter-multi") === "true" || Array.isArray(v);
        let active = false;
        if (v === "all" || v === null) {
          active = !filters[k];
        } else if (isMulti) {
          const cur = Array.isArray(filters[k]) ? filters[k] : [];
          const val = Array.isArray(v) ? v[0] : v;
          active = cur.indexOf(val) !== -1;
        } else {
          active = JSON.stringify(filters[k]) === JSON.stringify(v);
        }
        n.classList.toggle("btn-primary", active);
        n.classList.toggle("btn-outline-light", !active);
      });
    } catch (e) {}
  };

  const updateBulkActions = () => {
    const cont = document.getElementById(`${tableId}_bulk_actions`);
    if (!selectedIds.size) {
      cont.style.display = "none";
      cont.innerHTML = "";
      return;
    }

    cont.style.display = "flex";
    cont.innerHTML = "";

    const exportCSV = document.createElement("button");
    exportCSV.textContent = "Export CSV";
    exportCSV.className = "btn btn-sm btn-outline-primary me-2";
    exportCSV.onclick = () => window[`${tableId}_exportCSV`]();

    const exportXLSX = document.createElement("button");
    exportXLSX.textContent = "Export XLSX";
    exportXLSX.className = "btn btn-sm btn-outline-success me-2";
    exportXLSX.onclick = () => window[`${tableId}_exportXLSX`]();

    const exportPDF = document.createElement("button");
    exportPDF.textContent = "Export PDF";
    exportPDF.className = "btn btn-sm btn-outline-danger me-2";
    exportPDF.onclick = () => window[`${tableId}_exportPDF`]();

    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete Selected";
    delBtn.className = "btn btn-sm btn-danger";
    delBtn.onclick = () => {
      if (!confirm(`Delete ${selectedIds.size} items?`)) return;
      console.log(selectedIds);

      const ids = Array.from(selectedIds);
      const csrfToken = document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute("content");

      fetch(bulkDeleteUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "Zigry-Ajax",
          "X-CSRF-TOKEN": csrfToken,
        },
        body: JSON.stringify({ ids }),
      }).then(() => {
        selectedIds.clear();
        if (cbMaster) cbMaster.checked = false;
        fetchAndRender();
        saveState();
      });
    };

    cont.append(exportCSV, exportXLSX, exportPDF, delBtn);
  };

  function renderTable(json) {
    if (!tbody || isMobile !== window.innerWidth < 768) {
      isMobile = window.innerWidth < 768;
      buildStaticUI(json);
    }

    if (thead) {
      if (isMobile) thead.classList.add("d-none");
      else thead.classList.remove("d-none");
    }

    if (!isMobile) {
      calculateHiddenColumns();
      updateTheadVisibility();
    }

    // Show the appropriate view container
    try {
      updateFilterButtons();
    } catch (e) {}

    if (currentView === "grid") {
      // hide table, show grid
      if (tbody) tbody.parentElement.style.display = "none";
      if (listContainer) listContainer.style.display = "none";
      if (gridContainer) gridContainer.style.display = "";
      fillGrid(currentItems);
      try {
        if (typeof replaceZigryIcons === "function") replaceZigryIcons();
      } catch (e) {}
    } else if (currentView === "list") {
      if (tbody) tbody.parentElement.style.display = "none";
      if (gridContainer) gridContainer.style.display = "none";
      if (listContainer) listContainer.style.display = "";
      fillList(currentItems);
      try {
        if (typeof replaceZigryIcons === "function") replaceZigryIcons();
      } catch (e) {}
    } else {
      // default: table view
      if (gridContainer) gridContainer.style.display = "none";
      if (listContainer) listContainer.style.display = "none";
      if (tbody) tbody.parentElement.style.display = "";
      fillRows(currentItems);
      try {
        if (typeof replaceZigryIcons === "function") replaceZigryIcons();
      } catch (e) {}
      updatePagination(json);
    }
  }

  function fetchData(page = currentPage) {
    return fetch(buildUrl(page), {
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "Zigry-Ajax",
      },
    })
      .then((r) => r.json())
      .then((json) => {
        headers = fields.length
          ? fields
          : Object.keys((json.items || [])[0] || {});
        currentPage = json.currentPage || page;
        lastPage = json.lastPage || 1;
        return json;
      });
  }
  function fetchAndRender(page = currentPage) {
    return fetchPage(page, false);
  }

  // Public refresh helper: refresh table data (optionally append for infinite scroll)
  try {
    window[`${tableId}_refresh`] = (page = 1, append = false) => {
      if (append) return fetchPage(page, true);
      return fetchAndRender(page);
    };
  } catch (e) {
    /* ignore if window not writable */
  }

  // Public filter API: set/clear/get filters programmatically
  window[`${tableId}_setFilter`] = (key, value) => {
    currentFilters[key] = value;
    currentPage = 1;
    fetchAndRender(1);
    saveState();
    setTimeout(() => {
      try {
        updateFilterButtons();
      } catch (e) {}
    }, 80);
  };

  window[`${tableId}_clearFilter`] = (key) => {
    if (key) delete currentFilters[key];
    else currentFilters = {};
    currentPage = 1;
    fetchAndRender(1);
    saveState();
    setTimeout(() => {
      try {
        updateFilterButtons();
      } catch (e) {}
    }, 80);
  };

  window[`${tableId}_getFilters`] = () => ({ ...currentFilters });

  // Auto-bind any buttons with matching data attributes:
  // data-table="<tableId>" data-filter-key="status" data-filter-value="scheduled"
  const bindFilterButtons = () => {
    try {
      const nodes = document.querySelectorAll(
        `[data-table="${tableId}"][data-filter-key]`
      );
      nodes.forEach((n) => {
        if (n.getAttribute("data-filter-bound")) return; // skip already-bound (auto-created) buttons
        n.addEventListener("click", (e) => {
          e.preventDefault();
          const k = n.getAttribute("data-filter-key");
          let v = n.getAttribute("data-filter-value");
          try {
            v = JSON.parse(v);
          } catch (_) {}
          const isMulti =
            n.getAttribute("data-filter-multi") === "true" || Array.isArray(v);

          if (v === "all" || v === null) {
            window[`${tableId}_clearFilter`](k);
            return;
          }

          if (isMulti) {
            const cur = Array.isArray(currentFilters[k])
              ? [...currentFilters[k]]
              : [];
            const val = Array.isArray(v) ? v[0] : v;
            const idx = cur.indexOf(val);
            if (idx === -1) cur.push(val);
            else cur.splice(idx, 1);
            if (!cur.length) window[`${tableId}_clearFilter`](k);
            else window[`${tableId}_setFilter`](k, cur);
          } else {
            if (JSON.stringify(currentFilters[k]) === JSON.stringify(v)) {
              window[`${tableId}_clearFilter`](k);
            } else {
              window[`${tableId}_setFilter`](k, v);
            }
          }
        });
      });
    } catch (e) {}
  };

  function buildStaticUI(json) {
    const p = tableElement.parentElement;
    p.innerHTML = "";

    const card = document.createElement("div");
    card.className = classMap.card || "card";

    const hdr = document.createElement("div");
    hdr.className = classMap.header || "card-header";

    // Main flex container for Title (left) and Controls (right)
    const row = document.createElement("div");
    row.className =
      classMap.topRow ||
      "d-flex flex-wrap align-items-center justify-content-between gap-2";

    // Left: Title
    const left = document.createElement("div");
    left.className = classMap.leftControls || "d-flex align-items-center gap-3";
    if (title) {
      const t = document.createElement("h5");
      t.className = classMap.title || "card-title mb-0 text-nowrap";
      t.textContent = title;
      left.appendChild(t);
    }

    // Right: Search, Limit, View Toggles (appended later)
    const right = document.createElement("div");
    right.className =
      "d-flex flex-wrap align-items-center gap-2 justify-content-end flex-grow-1";

    // 1. Search Input (Moved to right for better alignment)
    searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.placeholder = json.translations?.search || "Search...";
    searchInput.value = currentSearch;
    searchInput.className =
      classMap.searchInput || "form-control form-control-sm";

    // Responsive width logic
    if (!isMobile) {
      searchInput.style.maxWidth = "250px";
      searchInput.classList.add("w-auto");
    } else {
      searchInput.classList.add("w-auto");
      searchInput.style.minWidth = "150px";
      searchInput.style.flexGrow = "1"; // Fill available space on mobile row
    }

    searchInput.addEventListener(
      "input",
      debounce(() => {
        currentSearch = searchInput.value;
        currentPage = 1;
        fetchAndRender(1);
      })
    );
    if (tb.showSearch) right.appendChild(searchInput);

    // 2. Limit Helper (Moved to right)
    limitSelect = document.createElement("select");
    limitSelect.className =
      classMap.limitSelect || "form-select form-select-sm w-auto";

    limits.forEach((l) => {
      const opt = new Option(l, l);
      if (+l === +currentLimit) opt.selected = true;
      limitSelect.appendChild(opt);
    });
    limitSelect.addEventListener("change", () => {
      currentLimit = +limitSelect.value;
      currentPage = 1;
      fetchAndRender(1);
    });
    if (tb.showLimit) right.appendChild(limitSelect);

    row.append(left, right);
    hdr.appendChild(row);
    // sub row inside header to host filter buttons (keeps them on their own line)
    const subRow = document.createElement("div");
    subRow.className = "d-flex align-items-center gap-2 mt-2";
    hdr.appendChild(subRow);
    card.appendChild(hdr);

    const bulk = document.createElement("div");
    bulk.id = `${tableId}_bulk_actions`;
    bulk.className =
      classMap.bulkActions || "px-3 py-2 border-bottom bg-light text-end";
    bulk.style.display = "none";
    card.appendChild(bulk);

    const body = document.createElement("div");
    body.className = classMap.body || "card-body p-0";
    // containers for alternative views
    gridContainer = document.createElement("div");
    gridContainer.id = `${tableId}_grid`;
    gridContainer.className = "row g-3 px-3 py-2";
    gridContainer.style.display = "none";

    listContainer = document.createElement("div");
    listContainer.id = `${tableId}_list`;
    listContainer.className = "list-group list-group-flush";
    listContainer.style.display = "none";
    const wrap = document.createElement("div");
    wrap.className = classMap.tableWrapper || "table-responsive";
    wrap.id = `accordion_${tableId}`; // important for accordion behavior
    // prevent unnecessary horizontal scrollbar by ensuring child can shrink
    wrap.style.overflowX = "hidden";
    wrap.style.minWidth = "0";

    const tbl = document.createElement("table");
    tbl.id = tableId;
    tbl.className = classMap.table || "table table-bordered table-hover";
    // force fixed layout so columns truncate instead of causing horizontal scroll
    tbl.style.tableLayout = "fixed";
    tbl.style.width = "100%";

    thead = document.createElement("thead");
    const hr = document.createElement("tr");

    const th0 = document.createElement("th");
    cbMaster = document.createElement("input");
    cbMaster.type = "checkbox";
    cbMaster.addEventListener("change", () => {
      tbody.querySelectorAll("input.select-row").forEach((cb) => {
        cb.checked = cbMaster.checked;
        cb.dispatchEvent(new Event("change"));
      });
    });
    th0.appendChild(cbMaster);
    // ensure checkbox column remains visible and not collapsed by fixed table layout
    th0.style.width = "44px";
    th0.style.minWidth = "44px";
    th0.style.maxWidth = "60px";
    th0.classList.add("text-center");
    hr.appendChild(th0);

    headers.forEach((h) => {
      const th = document.createElement("th");
      th.style.width = theadWidths[h] || "";
      th.classList.add("text-truncate");
      th.style.overflow = "hidden";
      th.style.textOverflow = "ellipsis";
      th.style.whiteSpace = "nowrap";
      const labelSpan = document.createElement("span");
      labelSpan.textContent = theadTitles[h] || h;

      const arrowSpan = document.createElement("span");
      arrowSpan.className = "sort-arrow ms-1";

      if (sortable.includes(h)) {
        th.style.cursor = "pointer";

        const index = currentSort.indexOf(h);
        const isSorted = index !== -1;
        const direction = isSorted ? currentOrder[index] : "asc";
        setArrowSVG(arrowSpan, direction, isSorted);

        if (isSorted) labelSpan.classList.add("fw-bold");

        th.addEventListener("click", () => {
          const index = currentSort.indexOf(h);

          if (index !== -1) {
            if (currentOrder[index] === "desc") {
              currentOrder[index] = "asc";
            } else {
              // Remove sort entirely after desc
              currentSort.splice(index, 1);
              currentOrder.splice(index, 1);
            }
          } else {
            currentSort.push(h);
            currentOrder.push("desc");
          }

          const newIndex = currentSort.indexOf(h);
          const direction = newIndex !== -1 ? currentOrder[newIndex] : "asc";
          setArrowSVG(arrowSpan, direction, newIndex !== -1);
          currentPage = 1;
          fetchAndRender(1);
        });

        th.append(labelSpan, arrowSpan);
      } else {
        th.appendChild(labelSpan);
      }

      hr.appendChild(th);
    });

    if (actions) {
      const thA = document.createElement("th");
      thA.textContent = "Actions";
      thA.style.width = theadWidths["actions"] || ""; // ? support external width config
      hr.appendChild(thA);
    }

    thead.appendChild(hr);
    tbl.appendChild(thead);

    tbody = document.createElement("tbody");
    tbl.appendChild(tbody);
    wrap.appendChild(tbl);
    wrap.appendChild(gridContainer);
    wrap.appendChild(listContainer);
    body.appendChild(wrap);
    card.appendChild(body);

    const ftr = document.createElement("div");
    ftr.className = classMap.footer || "card-footer";
    paginationContainer = document.createElement("div");
    // center pagination and make info responsive (stack on mobile)
    paginationContainer.className =
      classMap.pagination ||
      "d-flex flex-column flex-sm-row justify-content-center align-items-center mx-auto gap-2";
    ftr.appendChild(paginationContainer);
    card.appendChild(ftr);

    p.appendChild(card);
    // render any configured filter buttons (auto-generated) now that header exists
    try {
      if (tb.showFilterButtons)
        renderFilterButtons(filterButtons, subRow || left);
    } catch (e) {}
    // bind external filter buttons after initial UI built
    setTimeout(bindFilterButtons, 30);
    // add view toggle buttons to `right`
    const viewGroup = document.createElement("div");
    viewGroup.className = "btn-group btn-group-sm ms-2";

    const mk = (v, label) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `btn btn-sm ${
        currentView === v ? "btn-primary" : "btn-outline-secondary"
      }`;
      b.textContent = label;
      b.setAttribute("data-view", v);
      b.addEventListener("click", () => {
        currentView = v;
        saveState();
        // Toggle grid style selector visibility
        const gs = document.getElementById(`${tableId}_grid_style`);
        if (gs) {
          if (v === "grid") gs.classList.remove("d-none");
          else gs.classList.add("d-none");
        }
        renderTable({ items: currentItems, currentPage, lastPage });
      });
      return b;
    };

    if (tb.showViewToggle) {
      viewGroup.append(
        mk("table", "Table"),
        mk("grid", "Grid"),
        mk("list", "List")
      );
      right.appendChild(viewGroup);
    }

    // grid style selector (sub-grid styles)
    try {
      if (Array.isArray(gridStyles) && gridStyles.length > 0) {
        if (
          Array.isArray(gridStyles) &&
          gridStyles.length > 0 &&
          tb.showGridStyleSelector
        ) {
          const gs = document.createElement("select");
          gs.className = "form-select form-select-sm w-auto";
          // If initial view is not grid, hide it
          if (currentView !== "grid") gs.classList.add("d-none");

          gs.style.maxWidth = "120px";
          gs.style.fontSize = "0.75rem";
          gs.style.padding = "0.1rem 0.5rem";
          gs.style.height = "auto";
          gs.style.marginLeft = "4px"; // small gap but looks grouped

          gs.id = `${tableId}_grid_style`;
          gridStyles.forEach((s) => {
            const label = String(s)
              .replace(/[-_]/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase());
            const opt = new Option(label, s);
            if (s === currentGridStyle) opt.selected = true;
            gs.appendChild(opt);
          });
          gs.addEventListener("change", () => {
            currentGridStyle = gs.value;
            saveState();
            if (currentView === "grid")
              renderTable({ items: currentItems, currentPage, lastPage });
          });
          right.appendChild(gs);
        }
      }
    } catch (e) {}

    // ensure initial view visibility
    setTimeout(() => {
      // Save reference to wrapper for infinite scroll checks
      tableWrapper = wrap;

      // hide pagination if toolbar says so or if infinite scroll enabled
      if (!tb.showPagination || infiniteScroll)
        paginationContainer.style.display = "none";

      // attach window scroll listener once for infinite scroll
      if (infiniteScroll && !scrollAttached) {
        const handleScroll = debounce(() => {
          if (!infiniteScroll || loadingMore) return;
          if (currentPage >= lastPage) return;
          try {
            let nearEnd = false;
            if (
              tableWrapper &&
              tableWrapper.scrollHeight > tableWrapper.clientHeight
            ) {
              nearEnd =
                tableWrapper.scrollHeight -
                  tableWrapper.scrollTop -
                  tableWrapper.clientHeight <
                infiniteScrollThreshold;
            }
            const docNearEnd =
              document.documentElement.scrollHeight -
                window.innerHeight -
                window.scrollY <
              infiniteScrollThreshold;
            if (nearEnd || docNearEnd) {
              fetchPage(currentPage + 1, true).catch(() => {});
            }
          } catch (e) {}
        }, infiniteScrollDebounce);

        window.addEventListener("scroll", handleScroll);
        scrollAttached = true;
      }
    }, 30);
  }

  function fillRows(items) {
    tbody.innerHTML = "";

    if (isMobile) {
      const accordionGroupId = `accordion_${tableId}`;

      items.forEach((item, index) => {
        const collapseId = `collapse_${tableId}_${item.id || index}`;
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = headers.length + 2;
        const card = document.createElement("div");
        card.className = "card mb-2 w-100";
        card.setAttribute("data-id", collapseId);
        const mobileImg = getImageForItem(item);
        if (mobileImg) card.setAttribute("data-image", mobileImg);

        // Header: Smart Summary (Image + Title + Subtitle)
        const cardHeader = document.createElement("div");
        cardHeader.className = "card-header d-flex align-items-center gap-3";
        cardHeader.classList.add("cursor-pointer");

        // 1. Image
        if (mobileImg) {
          const imgEl = document.createElement("img");
          imgEl.src = mobileImg;
          imgEl.className = "rounded-circle";
          imgEl.style.width = "40px";
          imgEl.style.height = "40px";
          imgEl.style.objectFit = "cover";
          cardHeader.appendChild(imgEl);
        }

        // 2. Text Content (Title + Subtitle)
        const textContainer = document.createElement("div");
        textContainer.className = "flex-grow-1 overflow-hidden";

        // Find primary title field (Name > Title > Username > or first string field != id)
        const titleCandidates = [
          "name",
          "title",
          "username",
          "email",
          "subject",
        ];
        let titleKey = headers.find((h) =>
          titleCandidates.includes(h.toLowerCase())
        );
        if (!titleKey) {
          titleKey =
            headers.find((h) => !isImageLike(item[h]) && h !== "id") ||
            headers[0];
        }

        const titleVal = item[titleKey] ?? "";
        const titleEl = document.createElement("div");
        titleEl.className = "fw-bold text-truncate";
        titleEl.innerHTML = formatters[titleKey]
          ? formatters[titleKey](titleVal, item)
          : titleVal;

        // Find secondary subtitle field
        let subtitleKey = headers.find(
          (h) =>
            h !== titleKey &&
            h !== "id" &&
            !isImageLike(item[h]) &&
            ["email", "status", "role", "created", "joined"].some((cw) =>
              h.toLowerCase().includes(cw)
            )
        );
        if (!subtitleKey) {
          // Fallback to next available field that isn't ID or Image
          subtitleKey = headers.find(
            (h) => h !== titleKey && h !== "id" && !isImageLike(item[h])
          );
        }

        textContainer.appendChild(titleEl);

        if (subtitleKey) {
          const subVal = item[subtitleKey] ?? "";
          const subEl = document.createElement("div");
          subEl.className = "small text-muted text-truncate";
          subEl.innerHTML = formatters[subtitleKey]
            ? formatters[subtitleKey](subVal, item)
            : subVal;
          textContainer.appendChild(subEl);
        }

        cardHeader.appendChild(textContainer);

        const toggleBtn = document.createElement("button");
        toggleBtn.className = "btn btn-sm p-0";
        toggleBtn.setAttribute("data-bs-toggle", "collapse");
        toggleBtn.setAttribute("data-bs-target", `#${collapseId}`);
        toggleBtn.setAttribute("aria-expanded", "false");
        toggleBtn.setAttribute("aria-controls", collapseId);
        toggleBtn.innerHTML = "▸";
        cardHeader.appendChild(toggleBtn);

        // allow clicking header to toggle as well (mobile friendly)
        cardHeader.addEventListener("click", (e) => {
          // ignore clicks on action buttons
          if (
            e.target &&
            (e.target.tagName === "A" ||
              (e.target.closest && e.target.closest(".btn")))
          )
            return;
          // prefer bootstrap collapse if available
          const target = document.getElementById(collapseId);
          if (
            window.bootstrap &&
            typeof window.bootstrap.Collapse === "function"
          ) {
            const inst = window.bootstrap.Collapse.getOrCreateInstance(target);
            inst.toggle();
          } else {
            // fallback toggle
            const isShown = target.classList.contains("show");
            if (isShown) target.classList.remove("show");
            else target.classList.add("show");
            // update aria
            toggleBtn.setAttribute("aria-expanded", String(!isShown));
            toggleBtn.innerHTML = isShown ? "▸" : "▾";
          }
        });

        // Collapse body: remaining fields
        const collapse = document.createElement("div");
        collapse.className = "collapse";
        collapse.id = collapseId;
        collapse.setAttribute("data-bs-parent", `#${accordionGroupId}`);
        collapse.classList.add("w-100");

        const cardBody = document.createElement("div");
        cardBody.className = "card-body p-2";
        // use default bootstrap padding

        headers
          .slice(2)
          .filter((h) => !isImageLike(item[h]))
          .forEach((h) => {
            const row = document.createElement("div");
            row.className =
              "d-flex justify-content-between align-items-center border-bottom py-1";
            row.style.gap = "8px";

            const label = document.createElement("span");
            label.className = "text-muted small fw-bold";
            label.textContent = theadTitles[h] || h;

            const value = document.createElement("span");
            value.className = "small text-end";

            if (formatters[h]) {
              const fmt = formatters[h](item[h], item);
              if (typeof fmt === "string") value.innerHTML = fmt;
              else value.appendChild(fmt);
            } else {
              value.textContent = item[h] ?? "";
            }

            row.append(label, value);
            cardBody.appendChild(row);
          });

        // ? Action buttons row
        if (actions) {
          const actionRow = document.createElement("div");
          actionRow.className =
            "d-flex justify-content-end gap-2 pt-2 flex-wrap";

          const html = actions(item, {
            selected: selectedIds.has(String(resolveMapper(item))),
          });
          if (typeof html === "string") actionRow.innerHTML = html;
          else if (html instanceof Node) actionRow.appendChild(html);

          cardBody.appendChild(actionRow);
        }

        collapse.appendChild(cardBody);
        card.append(cardHeader, collapse);

        td.appendChild(card);
        tr.appendChild(td);
        tbody.appendChild(tr);

        // Accordion behavior: update icon when collapse shows/hides
        const observer = new MutationObserver(() => {
          const shown = document
            .getElementById(collapseId)
            ?.classList.contains("show");
          toggleBtn.innerHTML = shown ? "▾" : "▸";
        });
        observer.observe(document.body, { attributes: true, subtree: true });
      });
    } else {
      // Normal table view
      tbody.innerHTML = ""; // Clear previous rows

      if (!items.length) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = headers.length + 2; // checkbox + actions
        td.className = "text-center text-muted";
        td.textContent = "No records found.";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }

      items.forEach((item, index) => {
        const tr = document.createElement("tr");
        const hasHidden = !isMobile && hiddenColumns.size > 0;

        // 0. Checkbox
        const td0 = document.createElement("td");
        td0.className = "text-center";
        td0.style.width = "40px";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "select-row";
        cb.value = item.id; // fallback
        cb.dataset.id = String(resolveMapper(item));
        if (selectedIds.has(String(resolveMapper(item)))) cb.checked = true;

        const updateSel = () => {
          if (cb.checked) {
            tr.classList.add("table-active"); // highlight row
            selectedIds.add(String(resolveMapper(item)));
          } else {
            tr.classList.remove("table-active");
            selectedIds.delete(String(resolveMapper(item)));
          }
          if (cbMaster) {
            const all = tbody.querySelectorAll("input.select-row");
            const allChecked = Array.from(all).every((c) => c.checked);
            const someChecked = Array.from(all).some((c) => c.checked);
            cbMaster.checked = allChecked && all.length > 0;
            cbMaster.indeterminate = someChecked && !allChecked;
          }
          saveState();
          updateBulkActions();
        };

        cb.addEventListener("change", updateSel);
        td0.appendChild(cb);
        tr.appendChild(td0);

        // Render visible columns
        headers.forEach((h, i) => {
          if (!isMobile && hiddenColumns.has(h)) return; // Skip hidden

          const td = document.createElement("td");
          td.classList.add("text-truncate");
          td.style.overflow = "hidden";
          td.style.textOverflow = "ellipsis";
          td.style.whiteSpace = "nowrap";
          if (theadWidths[h]) td.style.maxWidth = theadWidths[h];

          // Add Toggle Icon to FIRST visible text column
          if (hasHidden && i === 0) {
            const toggle = document.createElement("button");
            toggle.className =
              "btn btn-sm btn-link p-0 me-2 text-decoration-none fw-bold";
            toggle.style.fontSize = "1.2em";
            toggle.style.lineHeight = "1";
            toggle.textContent = "+";
            toggle.onclick = (e) => {
              e.stopPropagation();
              const childId = `child_${tableId}_${index}`;
              const existingChild = document.getElementById(childId);

              if (existingChild) {
                if (existingChild.style.display === "none") {
                  existingChild.style.display = "table-row";
                  toggle.textContent = "-";
                } else {
                  existingChild.style.display = "none";
                  toggle.textContent = "+";
                }
              } else {
                const childTr = document.createElement("tr");
                childTr.id = childId;
                childTr.className = "bg-light";
                const childTd = document.createElement("td");
                childTd.colSpan = headers.length + 2;

                const ul = document.createElement("ul");
                ul.className = "list-unstyled mb-0 small";
                ul.style.paddingLeft = "50px";

                hiddenColumns.forEach((hc) => {
                  const li = document.createElement("li");
                  li.className = "mb-1";
                  const label = theadTitles[hc] || hc;
                  const val = formatters[hc]
                    ? typeof formatters[hc](item[hc], item) === "object"
                      ? formatters[hc](item[hc], item).outerHTML
                      : formatters[hc](item[hc], item)
                    : item[hc] ?? "";
                  li.innerHTML = `<span class="fw-bold me-2">${label}:</span> ${val}`;
                  ul.appendChild(li);
                });

                childTd.appendChild(ul);
                childTr.appendChild(childTd);
                tr.after(childTr);
                toggle.textContent = "-";
              }
            };
            td.prepend(toggle);
          }

          if (formatters[h]) {
            const fmt = formatters[h](item[h], item);
            if (typeof fmt === "object") td.appendChild(fmt);
            else td.innerHTML = fmt;
          } else {
            if (isImageLike(item[h])) {
              const img = document.createElement("img");
              img.src = item[h];
              img.className = "img-thumbnail rounded-0";
              img.style.width = "32px";
              img.style.height = "32px";
              img.style.objectFit = "cover";
              td.appendChild(img);
            } else {
              if (inlineEditable.includes(h)) {
                td.textContent = item[h];
                const originalValue = item[h];
                let preEditValue = originalValue;

                td.ondblclick = () => {
                  td.contentEditable = true;
                  td.focus();
                };
                td.onkeydown = (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    td.blur();
                  }
                };
                td.onblur = () => {
                  td.contentEditable = false;
                  const newValue = td.textContent;
                  if (newValue !== preEditValue) {
                    const patch = { [h]: newValue };
                    fetch(`${baseUrl}update/${resolveMapper(item)}`, {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                        "X-Requested-With": "Zigry-Ajax",
                      },
                      body: JSON.stringify(patch),
                    }).catch(console.error);
                    preEditValue = newValue;
                  }
                };
              } else {
                td.textContent = item[h];
                td.title = item[h];
              }
            }
          }
          tr.appendChild(td);
        });

        // Actions Column
        if (actions) {
          const tdA = document.createElement("td");
          tdA.style.whiteSpace = "nowrap";
          const html = actions(item, {
            selected: selectedIds.has(String(resolveMapper(item))),
          });
          if (typeof html === "string") tdA.innerHTML = html;
          else tdA.appendChild(html);
          tr.appendChild(tdA);
        }

        tbody.appendChild(tr);
      });
    }

    updateBulkActions();
    try {
      if (typeof replaceZigryIcons === "function") replaceZigryIcons();
    } catch (e) {}
  }

  // Fill grid view: show cards, with big image if first or second field looks like an image
  function fillGrid(items) {
    try {
      gridContainer.innerHTML = "";
      if (!items.length) {
        gridContainer.innerHTML =
          '<div class="text-center text-muted p-3">No records found.</div>';
        return;
      }

      const style = currentGridStyle || "card";

      // render variants
      if (style === "compact") {
        items.forEach((item) => {
          const col = document.createElement("div");
          col.className = "col-12 col-sm-6 col-md-4 col-lg-3";

          const card = document.createElement("div");
          card.className = "card h-100 small";
          card.style.overflow = "hidden";

          // Add itemLink click handler
          if (itemLink && item[itemLink]) {
            card.style.cursor = "pointer";
            card.addEventListener("click", (e) => {
              if (e.target.closest && e.target.closest(".btn, a, button"))
                return;
              const url = item[itemLink];
              if (typeof zigry !== "undefined" && zigry.navigate) {
                zigry.navigate(url);
              } else {
                window.location.href = url;
              }
            });
          }

          const imgUrl = getImageForItem(item);
          if (imgUrl) {
            const img = document.createElement("img");
            img.src = imgUrl;
            img.className = "card-img-top";
            img.style.objectFit = "cover";
            img.style.height = "100px";
            card.appendChild(img);
            card.setAttribute("data-image", imgUrl);
            col.setAttribute("data-image", imgUrl);
          }

          const body = document.createElement("div");
          body.className = "card-body p-2";
          const title = document.createElement("div");
          title.className = "fw-bold small mb-1";
          title.textContent = item[headers[0]] ?? `#${item.id || ""}`;
          body.appendChild(title);

          const details = document.createElement("div");
          details.className = "small text-muted";
          const compactFields = headers
            .slice(1, 3)
            .filter((h) => !isImageLike(item[h]));
          details.innerHTML = compactFields
            .map((h) => `${theadTitles[h] || h}: ${item[h] ?? ""}`)
            .join(" • ");
          body.appendChild(details);

          if (actions) {
            const act = document.createElement("div");
            act.className = "mt-2 d-flex gap-1 flex-wrap";
            const html = actions(item, {
              selected: selectedIds.has(String(resolveMapper(item))),
            });
            if (typeof html === "string") act.innerHTML = html;
            else if (html instanceof Node) act.appendChild(html);
            body.appendChild(act);
          }

          card.appendChild(body);
          col.appendChild(card);
          gridContainer.appendChild(col);
        });
      } else if (style === "image-left") {
        items.forEach((item) => {
          const col = document.createElement("div");
          col.className = "col-12";

          const card = document.createElement("div");
          card.className = "card mb-2";

          // Add itemLink click handler
          if (itemLink && item[itemLink]) {
            card.style.cursor = "pointer";
            card.addEventListener("click", (e) => {
              if (e.target.closest && e.target.closest(".btn, a, button"))
                return;
              const url = item[itemLink];
              if (typeof zigry !== "undefined" && zigry.navigate) {
                zigry.navigate(url);
              } else {
                window.location.href = url;
              }
            });
          }

          const row = document.createElement("div");
          row.className = "row g-0 align-items-center";

          // image column
          const imgUrl = getImageForItem(item);
          if (imgUrl) {
            const ic = document.createElement("div");
            ic.className = "col-auto";
            const img = document.createElement("img");
            img.src = imgUrl;
            img.style.width = "96px";
            img.style.height = "72px";
            img.style.objectFit = "cover";
            img.className = "img-thumbnail rounded-0";
            ic.appendChild(img);
            row.appendChild(ic);
            card.setAttribute("data-image", imgUrl);
            col.setAttribute("data-image", imgUrl);
          }

          const bc = document.createElement("div");
          bc.className = "col";
          const body = document.createElement("div");
          body.className = "card-body py-2";
          const title = document.createElement("h6");
          title.className = "card-title mb-1";
          title.textContent = item[headers[0]] ?? `#${item.id || ""}`;
          body.appendChild(title);

          const details = document.createElement("div");
          details.className = "small text-muted";
          const detailFields = headers
            .slice(1, 4)
            .filter((h) => !isImageLike(item[h]));
          details.innerHTML = detailFields
            .map(
              (h) => `<strong>${theadTitles[h] || h}:</strong> ${item[h] ?? ""}`
            )
            .join("<br>");
          body.appendChild(details);

          if (actions) {
            const act = document.createElement("div");
            act.className = "mt-2 d-flex gap-1";
            const html = actions(item, {
              selected: selectedIds.has(String(resolveMapper(item))),
            });
            if (typeof html === "string") act.innerHTML = html;
            else if (html instanceof Node) act.appendChild(html);
            body.appendChild(act);
          }

          bc.appendChild(body);
          row.appendChild(bc);
          card.appendChild(row);
          col.appendChild(card);
          gridContainer.appendChild(col);
        });
      } else {
        // default 'card' style (original)
        items.forEach((item) => {
          const col = document.createElement("div");
          col.className = "col-12 col-sm-6 col-md-4 col-lg-3";

          const card = document.createElement("div");
          card.className = "card h-100";

          // Add itemLink click handler
          if (itemLink && item[itemLink]) {
            card.style.cursor = "pointer";
            card.addEventListener("click", (e) => {
              // Don't navigate if clicking on action buttons
              if (e.target.closest && e.target.closest(".btn, a, button"))
                return;
              const url = item[itemLink];
              if (typeof zigry !== "undefined" && zigry.navigate) {
                zigry.navigate(url);
              } else {
                window.location.href = url;
              }
            });
          }

          const imgUrl = getImageForItem(item);
          if (imgUrl) {
            const img = document.createElement("img");
            img.src = imgUrl;
            img.className = "card-img-top";
            img.style.objectFit = "cover";
            img.style.height = "180px";
            card.appendChild(img);
            card.setAttribute("data-image", imgUrl);
            col.setAttribute("data-image", imgUrl);
          }

          const body = document.createElement("div");
          body.className = "card-body";

          const title = document.createElement("h6");
          title.className = "card-title mb-1";
          const firstLabel = headers[0] || "Item";
          title.textContent = item[firstLabel] ?? `#${item.id || ""}`;
          body.appendChild(title);

          // small details: show first 3 fields (skip image-like values)
          const details = document.createElement("div");
          details.className = "small text-muted";
          const lines = headers
            .slice(1, 4)
            .filter((h) => !isImageLike(item[h]))
            .map(
              (h) => `<strong>${theadTitles[h] || h}:</strong> ${item[h] ?? ""}`
            );
          details.innerHTML = lines.join("<br>");
          body.appendChild(details);

          // actions
          if (actions) {
            const act = document.createElement("div");
            act.className = "mt-2 d-flex gap-1";
            const html = actions(item, {
              selected: selectedIds.has(String(resolveMapper(item))),
            });
            if (typeof html === "string") act.innerHTML = html;
            else if (html instanceof Node) act.appendChild(html);
            body.appendChild(act);
          }

          card.appendChild(body);
          col.appendChild(card);
          gridContainer.appendChild(col);
        });
      }
    } catch (e) {
      console.error("fillGrid error", e);
    }
    try {
      if (typeof replaceZigryIcons === "function") replaceZigryIcons();
    } catch (e) {}
  }

  function fillList(items) {
    try {
      listContainer.innerHTML = "";
      if (!items.length) {
        listContainer.innerHTML =
          '<div class="list-group-item text-center text-muted">No records found.</div>';
        return;
      }

      items.forEach((item) => {
        const el = document.createElement("div");
        el.className = "list-group-item d-flex flex-wrap align-items-center";

        // toggle button for expand/collapse
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "btn btn-sm btn-link p-0 me-2";
        toggle.className =
          "btn btn-sm btn-link p-0 me-2 d-inline-flex align-items-center justify-content-center";
        toggle.innerHTML = "▸";

        const left = document.createElement("div");
        left.className = "flex-grow-1";

        // choose display fields (skip image-like values)
        const displayFields = (
          headers.length ? headers : Object.keys(item || {})
        ).filter((h) => !isImageLike(item[h]));
        const titleField = displayFields[0] || "id";
        const subtitleField = displayFields[1] || null;

        const titleText = item[titleField] ?? "#" + (item.id || "");
        const subtitleText = subtitleField ? item[subtitleField] ?? "" : "";

        left.innerHTML = `<div><strong>${titleText}</strong>${
          subtitleText
            ? '<br><small class="text-muted">' + subtitleText + "</small>"
            : ""
        }</div>`;

        // details area (hidden by default)
        const detailsDiv = document.createElement("div");
        detailsDiv.className = "w-100 mt-2 small text-muted";
        detailsDiv.classList.add("d-none");
        // include remaining non-image fields
        const detailFields = (
          displayFields.slice(2).length
            ? displayFields.slice(2)
            : Object.keys(item || {}).filter(
                (h) => !displayFields.includes(h) && !isImageLike(item[h])
              )
        ).slice(0, 6);
        if (detailFields.length) {
          detailsDiv.innerHTML = detailFields
            .map(
              (h) => `<strong>${theadTitles[h] || h}:</strong> ${item[h] ?? ""}`
            )
            .join("<br>");
        }

        toggle.addEventListener("click", (e) => {
          e.preventDefault();
          const open = !detailsDiv.classList.contains("d-none");
          detailsDiv.classList.toggle("d-none");
          toggle.innerHTML = open ? "▸" : "▾";
        });

        el.appendChild(toggle);
        el.appendChild(left);

        if (actions) {
          const right = document.createElement("div");
          right.className = "ms-auto";
          const html = actions(item, {
            selected: selectedIds.has(String(resolveMapper(item))),
          });
          if (typeof html === "string") right.innerHTML = html;
          else if (html instanceof Node) right.appendChild(html);
          el.appendChild(right);
        }

        if (detailsDiv.innerHTML) el.appendChild(detailsDiv);
        listContainer.appendChild(el);
      });
    } catch (e) {
      console.error("fillList error", e);
    }
    try {
      if (typeof replaceZigryIcons === "function") replaceZigryIcons();
    } catch (e) {}
  }

  function updatePagination(json = {}) {
    let total =
      json.total ??
      json.totalItems ??
      json.count ??
      (Array.isArray(json.items) ? json.items.length : 0);
    const per = json.perPage || currentLimit || 1;
    const page = Math.max(1, json.currentPage || currentPage);
    lastPage =
      json.lastPage || lastPage || Math.max(1, Math.ceil((total || 0) / per));

    // If server did not provide a total but provided items, use their length and adjust lastPage
    if (
      !json.total &&
      !json.totalItems &&
      !json.count &&
      Array.isArray(json.items)
    ) {
      total = json.items.length || 0;
      lastPage = Math.max(1, Math.ceil(total / per));
    }

    paginationContainer.innerHTML = "";

    const info = document.createElement("div");
    // responsive info: flexible on mobile
    info.className =
      classMap.pageInfo ||
      "text-muted small p-1 d-flex align-items-center flex-wrap me-2";
    let start = total ? Math.min((page - 1) * per + 1, total) : 0;
    let end = total ? Math.min(page * per, total) : 0;
    if (start > end) start = end; // clamp
    info.textContent = `Showing ${start}–${end} of ${total}`;

    const ul = document.createElement("ul");
    ul.className =
      classMap.paginationList ||
      "pagination pagination-sm mb-0 justify-content-center";

    const link = (txt, pg, disabled, active, isDots = false) => {
      const li = document.createElement("li");
      li.className = `page-item${disabled ? " disabled" : ""}${
        active ? " active" : ""
      }`;
      const a = document.createElement("a");
      a.className = classMap.pageLink || "page-link";
      a.href = "#";
      a.textContent = txt;
      // a.style.minWidth = '44px'; // fixed width for all buttons
      a.style.textAlign = "center";
      a.style.display = "inline-block";
      if (!isDots) {
        a.onclick = (e) => {
          e.preventDefault();
          if (!disabled) fetchAndRender(pg);
        };
      } else {
        a.style.pointerEvents = "none";
      }
      li.appendChild(a);
      return li;
    };

    // Always fixed Prev (use ASCII chevron to avoid encoding issues)
    ul.appendChild(link("\u00AB", page - 1, page === 1));

    // Decide how many number buttons to show based on lastPage digits
    const digitLength = String(lastPage).length;
    const maxSpace = 220; // total px allowed for number buttons
    const btnWidth = 50; // assumed width per button
    const visibleButtons = Math.max(
      3,
      Math.floor(maxSpace / (digitLength * 12 + 20))
    );

    const half = Math.floor(visibleButtons / 2);
    let startPage = Math.max(2, page - half);
    let endPage = Math.min(lastPage - 1, page + half);

    if (page <= half + 1) {
      startPage = 2;
      endPage = Math.min(lastPage - 1, startPage + visibleButtons - 1);
    } else if (page >= lastPage - half) {
      endPage = lastPage - 1;
      startPage = Math.max(2, endPage - visibleButtons + 1);
    }

    // Always first page
    ul.appendChild(link(1, 1, false, page === 1));

    if (startPage > 2) {
      ul.appendChild(link("...", 0, true, false, true));
    }

    for (let i = startPage; i <= endPage; i++) {
      ul.appendChild(link(i, i, false, i === page));
    }

    if (endPage < lastPage - 1) {
      ul.appendChild(link("...", 0, true, false, true));
    }

    if (lastPage > 1) {
      ul.appendChild(link(lastPage, lastPage, false, page === lastPage));
    }

    // Always fixed Next (use ASCII chevron to avoid encoding issues)
    ul.appendChild(link("\u00BB", page + 1, page === lastPage));

    const nav = document.createElement("nav");
    nav.className = "mx-auto";
    nav.appendChild(ul);

    // place info and nav inside pagination container; nav centered, info flexible on small screens
    paginationContainer.appendChild(info);
    paginationContainer.appendChild(nav);
  }

  window[`${tableId}_exportCSV`] = () => {
    const rows = Array.from(tbody.querySelectorAll("tr"))
      .filter((tr) => {
        const cb = tr.querySelector("input.select-row");
        return cb && cb.checked;
      })
      .map((tr) =>
        Array.from(tr.querySelectorAll("td"))
          .slice(1, -1)
          .map((td) => td.textContent)
      );
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.download = `${tableId}.csv`;
    a.href = URL.createObjectURL(blob);
    a.click();
  };

  window[`${tableId}_exportXLSX`] = () => {
    if (window.XLSX) {
      const ws = XLSX.utils.json_to_sheet(
        Array.from(tbody.querySelectorAll("tr"))
          .filter((tr) => tr.querySelector("input.select-row:checked"))
          .map((tr) => {
            const obj = {};
            headers.forEach(
              (h, i) => (obj[h] = tr.querySelectorAll("td")[i + 1].textContent)
            );
            return obj;
          })
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, `${tableId}.xlsx`);
    } else alert("Load SheetJS to export XLSX");
  };

  window[`${tableId}_exportPDF`] = () => {
    if (window.jspdf && window.jspdf.autoTable) {
      const doc = new jspdf.jsPDF();
      doc.autoTable({
        head: [headers],
        body: Array.from(tbody.querySelectorAll("tr"))
          .filter((tr) => tr.querySelector("input.select-row:checked"))
          .map((tr) =>
            Array.from(tr.querySelectorAll("td"))
              .slice(1, -1)
              .map((td) => td.textContent)
          ),
      });
      doc.save(`${tableId}.pdf`);
    } else alert("Load jsPDF + autoTable to export PDF");
  };

  fetchAndRender(currentPage);

  // Fallback: ensure filter buttons are inserted after table render (visible placement)
  setTimeout(() => {
    try {
      const fallbackTarget =
        tableElement.closest(".datatable-container") ||
        tableElement.parentElement ||
        document.body;
      renderFilterButtons(filterButtons, fallbackTarget);
    } catch (e) {
      console.error("zigryTable: failed to render filter buttons fallback", e);
    }
  }, 200);

  // Listen to resize
  window.addEventListener(
    "resize",
    debounce(() => {
      const nowMobile = window.innerWidth < 768;
      if (tbody && isMobile !== nowMobile && currentItems.length) {
        isMobile = nowMobile;
        renderTable({ items: currentItems, currentPage, lastPage });
      } else if (!isMobile) {
        // Desktop resize: check if we need to hide/show columns
        const changed = calculateHiddenColumns();
        if (changed) {
          updateTheadVisibility();
          fillRows(currentItems);
        }
      }
      // Ensure thead is hidden on mobile, shown on desktop
      if (thead) {
        if (isMobile) thead.classList.add("d-none");
        else thead.classList.remove("d-none");
      }
    }, 100)
  );

  function calculateHiddenColumns() {
    if (isMobile) {
      hiddenColumns.clear();
      return false;
    }

    const currentTable = document.getElementById(tableId);
    // If table is not in DOM (e.g. view switch), abort
    if (!currentTable || !currentTable.parentElement) return false;

    const containerWidth = currentTable.parentElement.clientWidth;
    // Estimate total needed width. Actions ~ 100, Checkbox ~ 50. Others ~ minColWidth or defined width.
    // We prioritize showing: Checkbox(if any), First Field, Actions.
    // We hide "middle" columns from right to left? Or simply check fit.

    // Let's count available slots
    // Fixed widths: Checkbox (44) + Actions (120 approx)
    let usedWidth = 44 + (actions ? 120 : 0);
    let available = containerWidth - usedWidth;
    if (available < 0) available = 0;

    // How many data columns can we fit?
    // We try to fit all. If not, remove candidates.
    // Candidates are all fields except first one (identifier).
    const candidates = headers.slice(1); // Keep headers[0] always
    const mustKeep = [headers[0]];

    const totalNeeded = headers.length * minColWidth;
    let oldSize = hiddenColumns.size;

    hiddenColumns.clear();

    if (totalNeeded <= available + candidates.length * minColWidth) {
      // Simple check: do we have enough space for *all*?
      // Actually, let's just add columns until full.
      let currentW = 0;
      // First column always visible
      currentW += minColWidth;

      // Check remainder
      for (let i = 0; i < candidates.length; i++) {
        if (currentW + minColWidth > available) {
          // No space for this one
          hiddenColumns.add(candidates[i]);
        } else {
          currentW += minColWidth;
        }
      }
    } else {
      // Super narrow? Hide all candidates
      candidates.forEach((c) => hiddenColumns.add(c));
    }

    // Return true if set changed (primitive check, sets don't have direct equality, but size diff or items diff)
    return oldSize !== hiddenColumns.size; // Good enough approximation for resize flicker
  }

  function updateTheadVisibility() {
    if (!thead) return;
    // Index 0 (Checkbox) triggers at 0
    // Headers start at 1? No, headers array corresponds to th indices 1..N
    // th 0 is Checkbox.
    // th 1 is headers[0]...

    const ths = thead.querySelectorAll("th");
    // Skip th[0] (Checkbox)

    headers.forEach((h, i) => {
      // th index is i + 1
      const th = ths[i + 1];
      if (th) {
        if (hiddenColumns.has(h)) th.style.display = "none";
        else th.style.display = "";
      }
    });
  }
}
