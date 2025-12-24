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
    bulkDeleteMapper = 'id',
    formatters = {},
  } = options;

  const resolveMapper = typeof bulkDeleteMapper === 'function'
    ? bulkDeleteMapper
    : (row => row[bulkDeleteMapper] ?? row.id);
  let currentItems = []; // 🔁 Cache the fetched items
  let cbMaster;
  let headers = [], currentPage = 1, lastPage = 1, currentSearch = '', currentSort = [], currentOrder = [], currentLimit = defaultLimit;
  const tableElement = document.getElementById(tableId);
  let searchInput, paginationContainer, tbody, limitSelect, isMobile = window.innerWidth < 768;
  let selectedIds = new Set();
  let thead;
  const storageKey = `zigryTable_state_${tableId}`;
  const selectedKey = `zigryTable_selected_${tableId}`;

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (saved.sort) currentSort = saved.sort.split(',');
    if (saved.order) currentOrder = saved.order.split(',');
    if (saved.search) currentSearch = saved.search;
    // if (saved.sort) [currentSort, currentOrder] = [saved.sort, saved.order];
    if (saved.limit) currentLimit = saved.limit;
    if (saved.page) currentPage = saved.page;
  } catch { }

  try {
    selectedIds = new Set(JSON.parse(localStorage.getItem(selectedKey) || '[]'));
  } catch { }

  const debounce = (fn, delay = 300) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  };

  const saveState = () => {
    localStorage.setItem(storageKey, JSON.stringify({
      search: currentSearch,
      sort: currentSort.join(','),
      order: currentOrder.join(','),
      limit: currentLimit,
      page: currentPage
    }));
    localStorage.setItem(selectedKey, JSON.stringify(Array.from(selectedIds)));
  };

  const buildUrl = (page) => {
    const u = new URL(location.origin + baseUrl + page);
    const p = u.searchParams;

    if (currentSearch) p.set('search', currentSearch);

    if (currentSort?.length) {
      const uniqueSort = [...new Set(currentSort)];
      const uniqueOrder = currentOrder?.slice(0, uniqueSort.length) || [];

      p.set('sort', uniqueSort.join(','));
      p.set('order', uniqueOrder.join(','));
    }

    if (currentLimit) p.set('limit', currentLimit);

    return u.pathname + '?' + p.toString();
  };


  const updateBulkActions = () => {
    const cont = document.getElementById(`${tableId}_bulk_actions`);
    if (!selectedIds.size) {
      cont.style.display = 'none';
      cont.innerHTML = '';
      return;
    }

    cont.style.display = 'flex';
    cont.innerHTML = '';

    const exportCSV = document.createElement('button');
    exportCSV.textContent = 'Export CSV';
    exportCSV.className = 'btn btn-sm btn-outline-primary me-2';
    exportCSV.onclick = () => window[`${tableId}_exportCSV`]();

    const exportXLSX = document.createElement('button');
    exportXLSX.textContent = 'Export XLSX';
    exportXLSX.className = 'btn btn-sm btn-outline-success me-2';
    exportXLSX.onclick = () => window[`${tableId}_exportXLSX`]();

    const exportPDF = document.createElement('button');
    exportPDF.textContent = 'Export PDF';
    exportPDF.className = 'btn btn-sm btn-outline-danger me-2';
    exportPDF.onclick = () => window[`${tableId}_exportPDF`]();

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete Selected';
    delBtn.className = 'btn btn-sm btn-danger';
    delBtn.onclick = () => {
      if (!confirm(`Delete ${selectedIds.size} items?`)) return;
      console.log(selectedIds);
      // const ids = Array.from(selectedIds).map(id => bulkDeleteMapper(Number(id)));
      // const ids = Array.from(selectedIds).map(bulkDeleteMapper);
      // const ids = Array.from(selectedIds).map(id => resolveMapper({ id }));
      const ids = Array.from(selectedIds);

      fetch(bulkDeleteUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'Zigry-Ajax'
        },
        body: JSON.stringify({ ids })
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
    if (!tbody || isMobile !== (window.innerWidth < 768)) {
      isMobile = window.innerWidth < 768;
      buildStaticUI(json);
    }

    fillRows(currentItems);
    updatePagination(json);
  }

  function fetchData(page = currentPage) {
    return fetch(
      buildUrl(page),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'Zigry-Ajax'
        }
      }
    )
      .then(r => r.json())
      .then(json => {
        headers = fields.length ? fields : Object.keys((json.items || [])[0] || {});
        currentPage = json.currentPage || page;
        lastPage = json.lastPage || 1;
        currentItems = json.items || [];
        return json;
      });
  }
  function fetchAndRender(page = currentPage) {
    fetchData(page).then(json => {
      renderTable(json);
      saveState();
    });
  }


  function buildStaticUI(json) {
    const p = tableElement.parentElement;
    p.innerHTML = '';

    const card = document.createElement('div');
    card.className = classMap.card || 'card';

    const hdr = document.createElement('div');
    hdr.className = classMap.header || 'card-header';
    const row = document.createElement('div');
    row.className = classMap.topRow || 'd-flex justify-content-between align-items-center';

    const left = document.createElement('div');
    left.className = classMap.leftControls || 'd-flex align-items-center gap-3';
    if (title) {
      const t = document.createElement('h5');
      t.className = classMap.title || 'card-title mb-0';
      t.textContent = title;
      left.appendChild(t);
    }

    searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = json.translations?.search || 'Search...';
    searchInput.value = currentSearch;
    searchInput.className = classMap.searchInput || 'form-control form-control-sm';
    searchInput.style.width = '200px';
    searchInput.addEventListener('input', debounce(() => {
      currentSearch = searchInput.value;
      currentPage = 1;
      fetchAndRender(1);
    }));
    left.appendChild(searchInput);

    const right = document.createElement('div');
    limitSelect = document.createElement('select');
    limitSelect.className = classMap.limitSelect || 'form-select form-select-sm';
    limitSelect.style.width = '80px';
    // limits.forEach(l => limitSelect.appendChild(new Option(l, l, l === currentLimit)));
    limits.forEach(l => {
      const opt = new Option(l, l);
      if (+l === +currentLimit) opt.selected = true; // force selected
      limitSelect.appendChild(opt);
    });
    limitSelect.addEventListener('change', () => {
      currentLimit = +limitSelect.value;
      currentPage = 1;
      fetchAndRender(1);
    });
    right.appendChild(limitSelect);

    row.append(left, right);
    hdr.appendChild(row);
    card.appendChild(hdr);

    const bulk = document.createElement('div');
    bulk.id = `${tableId}_bulk_actions`;
    bulk.className = classMap.bulkActions || 'px-3 py-2 border-bottom bg-light text-end';
    bulk.style.display = 'none';
    card.appendChild(bulk);

    const body = document.createElement('div');
    body.className = classMap.body || 'card-body p-0';
    const wrap = document.createElement('div');
    wrap.className = classMap.tableWrapper || 'table-responsive';
    wrap.id = `accordion_${tableId}`; // important for accordion behavior


    const tbl = document.createElement('table');
    tbl.id = tableId;
    tbl.className = classMap.table || 'table table-bordered table-hover';

    thead = document.createElement('thead');
    const hr = document.createElement('tr');

    const th0 = document.createElement('th');
    cbMaster = document.createElement('input');
    cbMaster.type = 'checkbox';
    cbMaster.addEventListener('change', () => {
      tbody.querySelectorAll('input.select-row').forEach(cb => {
        cb.checked = cbMaster.checked;
        cb.dispatchEvent(new Event('change'));
      });
    });
    th0.appendChild(cbMaster);
    hr.appendChild(th0);

    headers.forEach(h => {
      const th = document.createElement('th');
      th.style.width = theadWidths[h] || '';
      const labelSpan = document.createElement('span');
      labelSpan.textContent = theadTitles[h] || h;

      const arrowSpan = document.createElement('span');
      arrowSpan.className = 'sort-arrow ms-1';

      if (sortable.includes(h)) {
        th.style.cursor = 'pointer';

        const index = currentSort.indexOf(h);
        const isSorted = index !== -1;
        const direction = isSorted ? currentOrder[index] : 'asc';
        arrowSpan.textContent = direction === 'asc' ? '▲' : '▼';

        if (!isSorted) {
          arrowSpan.style.opacity = '0.4';
          arrowSpan.textContent = '■';
        }
        else labelSpan.classList.add('fw-bold');

        th.addEventListener('click', () => {
          const index = currentSort.indexOf(h);

          if (index !== -1) {
            if (currentOrder[index] === 'desc') {
              currentOrder[index] = 'asc';
            } else {
              // Remove sort entirely after desc
              currentSort.splice(index, 1);
              currentOrder.splice(index, 1);
            }
          } else {
            currentSort.push(h);
            currentOrder.push('desc');
          }

          const newIndex = currentSort.indexOf(h);
          const direction = newIndex !== -1 ? currentOrder[newIndex] : 'asc';
          arrowSpan.textContent = direction === 'asc' ? '▲' : '▼';
          arrowSpan.style.opacity = newIndex === -1 ? '0.4' : '1';
          if (newIndex === -1) {
            arrowSpan.textContent = '■';
          }
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
      const thA = document.createElement('th');
      thA.textContent = 'Actions';
      thA.style.width = theadWidths['actions'] || ''; // ✅ support external width config
      hr.appendChild(thA);
    }

    thead.appendChild(hr);
    tbl.appendChild(thead);
    if (typeof replaceZigryIcons === 'function') replaceZigryIcons(thead);

    tbody = document.createElement('tbody');
    tbl.appendChild(tbody);
    wrap.appendChild(tbl);
    body.appendChild(wrap);
    card.appendChild(body);

    const ftr = document.createElement('div');
    ftr.className = classMap.footer || 'card-footer';
    paginationContainer = document.createElement('div');
    paginationContainer.className = classMap.pagination || 'd-flex justify-content-between align-items-center mx-auto';
    ftr.appendChild(paginationContainer);
    card.appendChild(ftr);

    p.appendChild(card);
  }

  function fillRows(items) {
    tbody.innerHTML = '';

    if (isMobile) {
      const accordionGroupId = `accordion_${tableId}`;

      items.forEach((item, index) => {
        const collapseId = `collapse_${tableId}_${item.id || index}`;
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = headers.length + 2;

        const card = document.createElement('div');
        card.className = 'card mb-2';
        card.setAttribute('data-id', collapseId);

        // Header: Show first 2 fields (summary view)
        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header d-flex align-items-center justify-content-between';

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn btn-sm p-0 me-2';
        toggleBtn.setAttribute('data-bs-toggle', 'collapse');
        toggleBtn.setAttribute('data-bs-target', `#${collapseId}`);
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.setAttribute('aria-controls', collapseId);
        toggleBtn.innerHTML = '➕';

        const summary = document.createElement('div');
        summary.className = 'summary-block flex-grow-1 d-flex flex-column gap-1';
        summary.setAttribute('data-summary', collapseId); // attach collapse id


        // Format summary items in a clean flex layout
        const summaryHTML = headers.slice(0, 3).map(h => {
          let value = item[h] ?? '';
          if (formatters[h]) {
            const formatted = formatters[h](value, item);
            value = typeof formatted === 'string' ? formatted : (formatted?.outerHTML || value);
          }
          return `
    <div class="d-flex justify-content-between w-100">
       <span class="fw-bold small">${theadTitles[h] || h}</span>
       <span class="small">${value}</span>
    </div>
  `;
        }).join('');

        summary.innerHTML = summaryHTML;

        // ORDER FIXED:
        cardHeader.appendChild(toggleBtn);
        cardHeader.appendChild(summary);


        // Collapse body: remaining fields
        const collapse = document.createElement('div');
        collapse.className = 'collapse';
        collapse.id = collapseId;
        collapse.setAttribute('data-bs-parent', `#${accordionGroupId}`);

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body p-2';

        headers.slice(1).forEach(h => {
          const row = document.createElement('div');
          row.className = 'd-flex justify-content-between align-items-center border-bottom py-1';

          const label = document.createElement('span');
          label.className = 'text-muted small fw-bold';
          label.textContent = theadTitles[h] || h;

          const value = document.createElement('span');
          value.className = 'small text-end';

          if (formatters[h]) {
            const fmt = formatters[h](item[h], item);
            if (typeof fmt === 'string') value.innerHTML = fmt;
            else value.appendChild(fmt);
          } else {
            value.textContent = item[h] ?? '';
          }

          row.append(label, value);
          cardBody.appendChild(row);
        });

        // ✅ Action buttons row
        if (actions) {
          const actionRow = document.createElement('div');
          actionRow.className = 'd-flex justify-content-end gap-2 pt-2 flex-wrap';

          const html = actions(item, { selected: selectedIds.has(item.id) });
          if (typeof html === 'string') actionRow.innerHTML = html;
          else if (html instanceof Node) actionRow.appendChild(html);

          cardBody.appendChild(actionRow);
        }


        collapse.appendChild(cardBody);
        card.append(cardHeader, collapse);

        td.appendChild(card);
        tr.appendChild(td);
        tbody.appendChild(tr);

        // Accordion behavior: collapse others
        toggleBtn.addEventListener('click', () => {
          if (typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
            const all = tbody.querySelectorAll('.collapse.show');
            all.forEach(el => {
              if (el.id !== collapseId) bootstrap.Collapse.getOrCreateInstance(el).hide();
            });
            const current = bootstrap.Collapse.getOrCreateInstance(document.getElementById(collapseId));
            current.toggle();
          } else {
            // Manual toggle fallback
            const collapseElem = document.getElementById(collapseId);
            if (collapseElem) {
              collapseElem.classList.toggle('show');
            }
          }
        });

        // Toggle icon ➕/➖
        const collapseElem = document.getElementById(collapseId);
        if (collapseElem) {
          const observer = new MutationObserver(() => {
            const shown = collapseElem.classList.contains('show');

            // toggle +/- icon
            toggleBtn.innerHTML = shown ? '➖' : '➕';

            // hide summary when expanded, show when collapsed
            const summaryBlock = cardHeader.querySelector('.summary-block');
            if (summaryBlock) {
              summaryBlock.classList.toggle('d-none', shown);
            }
          });

          observer.observe(collapseElem, { attributes: true, attributeFilter: ['class'] });
        }

      });

    } else {
      // Normal table view
      tbody.innerHTML = ''; // Clear previous rows

      if (!items.length) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = headers.length + 2; // checkbox + actions
        td.className = 'text-center text-muted';
        td.textContent = 'No records found.';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }

      items.forEach(item => {
        const tr = document.createElement('tr');
        const td0 = document.createElement('td');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'select-row';
        cb.value = item.id;
        cb.checked = selectedIds.has(resolveMapper(item));
        cb.addEventListener('change', () => {
          const key = resolveMapper(item);
          if (cb.checked) {
            selectedIds.add(key);
          } else {
            selectedIds.delete(key);
          }
          updateBulkActions();
          saveState();
        });

        td0.appendChild(cb);
        tr.appendChild(td0);

        headers.forEach(h => {
          const td = document.createElement('td');
          const originalValue = item[h] ?? '';

          if (formatters[h]) {
            const fmt = formatters[h](originalValue, item);
            if (typeof fmt === 'string') td.innerHTML = fmt;
            else td.appendChild(fmt);
          } else {
            td.textContent = originalValue;
          }

          if (inlineEditable.includes(h)) {
            td.dataset.field = h;
            td.dataset.id = resolveMapper(item);

            let preEditValue = originalValue;

            td.addEventListener('dblclick', () => {
              td.contentEditable = true;
              td.focus();
            });

            td.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                td.blur();
              }
            });

            td.addEventListener('blur', () => {
              td.contentEditable = false;
              const newValue = td.textContent;

              // Only send if changed
              if (newValue !== preEditValue) {
                const patch = { [h]: newValue };

                fetch(`${baseUrl}update/${resolveMapper(item)}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'Zigry-Ajax'
                  },
                  body: JSON.stringify(patch)
                }).catch(console.error);

                // Update preEditValue to avoid resending
                preEditValue = newValue;
              }
            });
          }

          tr.appendChild(td);
        });



        if (actions) {
          const tdA = document.createElement('td');
          const html = actions(item, { selected: selectedIds.has(item.id) });
          if (typeof html === 'string') tdA.innerHTML = html;
          else if (html instanceof Node) tdA.appendChild(html);
          tr.appendChild(tdA);
        }

        tbody.appendChild(tr);
      });
    }

    if (typeof replaceZigryIcons === 'function') replaceZigryIcons(tbody);
    updateBulkActions();
  }


  function updatePagination(json = {}) {
    const total = json.total || 0;
    const per = json.perPage || currentLimit;
    const page = json.currentPage || currentPage;
    lastPage = json.lastPage || lastPage;

    paginationContainer.innerHTML = '';

    const info = document.createElement('div');
    info.className = classMap.pageInfo || 'text-muted small z-3 p-1 position-absolute';
    const start = !total ? 0 : (page - 1) * per + 1;
    const end = Math.min(page * per, total);
    info.textContent = `Showing ${start}–${end} of ${total}`;

    const ul = document.createElement('ul');
    ul.className = classMap.paginationList || 'pagination pagination-sm mb-0 justify-content-center gap-5 mx-auto';

    const link = (txt, pg, disabled, active, isDots = false) => {
      const li = document.createElement('li');
      li.className = `page-item${disabled ? ' disabled' : ''}${active ? ' active' : ''}`;
      const a = document.createElement('a');
      a.className = classMap.pageLink || 'page-link';
      a.href = '#';
      a.textContent = txt;
      // a.style.minWidth = '44px'; // fixed width for all buttons
      a.style.textAlign = 'center';
      a.style.display = 'inline-block';
      if (!isDots) {
        a.onclick = e => {
          e.preventDefault();
          if (!disabled) fetchAndRender(pg);
        };
      } else {
        a.style.pointerEvents = 'none';
      }
      li.appendChild(a);
      return li;
    };

    // Always fixed Prev
    ul.appendChild(link('«', page - 1, page === 1));

    // Decide how many number buttons to show based on lastPage digits
    const digitLength = String(lastPage).length;
    const maxSpace = 220; // total px allowed for number buttons
    const btnWidth = 50; // assumed width per button
    const visibleButtons = Math.max(3, Math.floor(maxSpace / (digitLength * 12 + 20)));

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

    // if (startPage > 2) {
    //   ul.appendChild(link('...', 0, true, false, true));
    // }

    for (let i = startPage; i <= endPage; i++) {
      ul.appendChild(link(i, i, false, i === page));
    }

    // if (endPage < lastPage - 1) {
    //   ul.appendChild(link('...', 0, true, false, true));
    // }

    if (lastPage > 1) {
      ul.appendChild(link(lastPage, lastPage, false, page === lastPage));
    }

    // Always fixed Next
    ul.appendChild(link('»', page + 1, page === lastPage));

    const nav = document.createElement('nav');
    nav.style.minWidth = '100%';
    nav.className = 'mx-auto';
    nav.appendChild(ul);

    paginationContainer.appendChild(info);
    paginationContainer.appendChild(nav);
  }



  window[`${tableId}_exportCSV`] = () => {
    const rows = Array.from(tbody.querySelectorAll('tr')).filter(tr => {
      const cb = tr.querySelector('input.select-row');
      return cb && cb.checked;
    }).map(tr =>
      Array.from(tr.querySelectorAll('td')).slice(1, -1).map(td => td.textContent)
    );
    const csv = [headers, ...rows].map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.download = `${tableId}.csv`;
    a.href = URL.createObjectURL(blob);
    a.click();
  };

  window[`${tableId}_exportXLSX`] = () => {
    if (window.XLSX) {
      const ws = XLSX.utils.json_to_sheet(
        Array.from(tbody.querySelectorAll('tr')).filter(tr => tr.querySelector('input.select-row:checked')).map(tr => {
          const obj = {};
          headers.forEach((h, i) => obj[h] = tr.querySelectorAll('td')[i + 1].textContent);
          return obj;
        })
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, `${tableId}.xlsx`);
    } else alert('Load SheetJS to export XLSX');
  };

  window[`${tableId}_exportPDF`] = () => {
    if (window.jspdf && window.jspdf.autoTable) {
      const doc = new jspdf.jsPDF();
      doc.autoTable({
        head: [headers],
        body: Array.from(tbody.querySelectorAll('tr')).filter(tr => tr.querySelector('input.select-row:checked')).map(tr =>
          Array.from(tr.querySelectorAll('td')).slice(1, -1).map(td => td.textContent)
        )
      });
      doc.save(`${tableId}.pdf`);
    } else alert('Load jsPDF + autoTable to export PDF');
  };

  fetchAndRender(currentPage);

  window.addEventListener('resize', debounce(() => {
    const nowMobile = window.innerWidth < 768;
    if (tbody && isMobile !== nowMobile && currentItems.length) {
      isMobile = nowMobile;
      thead.classList.add('d-none');
      renderTable({ items: currentItems, currentPage, lastPage });
    } else {
      thead.classList.remove('d-none');
    }
  }, 100));
}
