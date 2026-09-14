(() => {
  'use strict';

  const STORAGE_KEY = 'dbs-global-filters-v1';
  const filters = {
    group: '',
    month: null,
    includePresidencia: true
  };
  let syncing = false;

  function installAreaChartExpansion() {
    if (document.getElementById('dbs-area-chart-expand')) return;
    const style = document.createElement('style');
    style.id = 'dbs-area-chart-expand';
    style.textContent = `
      #page-dashboard .oec-area-viz {
        display:grid !important;
        grid-template-columns:minmax(0,1fr) !important;
        gap:0 !important;
        width:100% !important;
      }
      #page-dashboard .oec-area-controls {
        display:none !important;
      }
      #page-dashboard .oec-area-chart,
      #page-dashboard .oec-area-bars {
        width:100% !important;
        max-width:none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function installVisualFixes() {
    if (document.getElementById('dbs-responsive-visual-fixes')) return;
    const style = document.createElement('style');
    style.id = 'dbs-responsive-visual-fixes';
    style.textContent = `
      /* Dashboard: importes completos y sin cortes */
      #page-dashboard .target-real-group {
        grid-template-columns:minmax(0,1.4fr) minmax(135px,.6fr) !important;
        min-width:0 !important;
      }
      #page-dashboard .target-real-group .metric-block {
        min-width:0 !important;
        overflow:visible !important;
      }
      #page-dashboard .target-real-group .metric-number {
        font-size:clamp(24px,2.05vw,36px) !important;
        line-height:1.04 !important;
        letter-spacing:-.035em !important;
        white-space:nowrap !important;
        overflow:visible !important;
        text-overflow:clip !important;
      }
      #page-dashboard .target-real-group .target-total .metric-number {
        font-size:clamp(25px,2.1vw,37px) !important;
      }
      #page-dashboard .target-real-group .metric-label {
        font-size:11px !important;
        line-height:1.25 !important;
      }

      /* P&L: composición visible y legible */
      #page-area .pnl-layout {
        grid-template-columns:minmax(0,1fr) minmax(390px,440px) !important;
        gap:24px !important;
        align-items:start !important;
      }
      #page-area .pnl-layout > * {
        min-width:0 !important;
      }
      #page-area #compositionList {
        display:grid !important;
        grid-template-columns:1fr !important;
        gap:10px !important;
        width:100% !important;
        min-width:0 !important;
      }
      #page-area #compositionList .comp-row {
        width:100% !important;
        min-width:0 !important;
        max-width:100% !important;
        overflow:hidden !important;
      }
      #page-area #compositionList .comp-head {
        display:grid !important;
        grid-template-columns:minmax(0,1fr) auto !important;
        gap:12px !important;
        align-items:start !important;
        width:100% !important;
        min-width:0 !important;
        padding:14px 16px !important;
      }
      #page-area #compositionList .comp-main {
        min-width:0 !important;
      }
      #page-area #compositionList .comp-name {
        white-space:normal !important;
        overflow:visible !important;
        text-overflow:clip !important;
        overflow-wrap:anywhere !important;
        line-height:1.25 !important;
      }
      #page-area #compositionList .comp-ceco {
        white-space:normal !important;
        overflow-wrap:anywhere !important;
      }
      #page-area #compositionList .comp-values {
        min-width:118px !important;
        max-width:145px !important;
        text-align:right !important;
      }
      #page-area #compositionList .comp-values b,
      #page-area #compositionList .comp-values small {
        display:block !important;
        white-space:normal !important;
        overflow-wrap:anywhere !important;
      }

      /* Si no cabe a la derecha, la composición pasa debajo y ocupa todo el ancho. */
      @media (max-width:1350px) {
        #page-area .pnl-layout {
          grid-template-columns:1fr !important;
        }
        #page-area #compositionList {
          grid-template-columns:repeat(2,minmax(0,1fr)) !important;
        }
      }
      @media (max-width:820px) {
        #page-dashboard .target-real-group {
          grid-template-columns:1fr !important;
        }
        #page-dashboard .target-real-group .target-total {
          grid-column:1 !important;
        }
        #page-dashboard .target-real-group .metric-number {
          font-size:clamp(26px,8vw,37px) !important;
        }
        #page-area #compositionList {
          grid-template-columns:1fr !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function isPresidencia(value) {
    return String(value || '').trim().toLowerCase() === 'presidencia';
  }

  function hasOption(select, value) {
    if (!select) return false;
    return Array.from(select.options || []).some((o) => String(o.value) === String(value));
  }

  function setSelect(select, value) {
    if (!select || !hasOption(select, value)) return false;
    select.value = value;
    return true;
  }

  function saveFilters() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (_) {}
    window.DBS_GLOBAL_FILTERS = { ...filters };
  }

  function loadFilters() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        filters.group = String(saved.group || '');
        filters.month = Number(saved.month || 0) || null;
        filters.includePresidencia = saved.includePresidencia !== false;
        return true;
      }
    } catch (_) {}
    return false;
  }

  function dashboardValues() {
    const group = document.getElementById('dashGroup');
    const month = document.getElementById('dashMonth');
    const activePres = document.querySelector('#dashPresidencyToggle [data-pres-mode].active');
    return {
      group: group ? String(group.value || '') : '',
      month: month ? Number(month.value || 0) : null,
      includePresidencia: activePres ? activePres.dataset.presMode !== 'without' : true
    };
  }

  function writeFiltersToDashboard(render = false) {
    const group = document.getElementById('dashGroup');
    const month = document.getElementById('dashMonth');
    if (group && (filters.group === '' || hasOption(group, filters.group))) group.value = filters.group;
    if (month && filters.month && hasOption(month, String(filters.month))) month.value = String(filters.month);

    try {
      if (typeof dashIncludePresidencia !== 'undefined') dashIncludePresidencia = filters.includePresidencia;
      if (typeof syncDashPresidencyToggle === 'function') syncDashPresidencyToggle();
    } catch (_) {}

    if (render && typeof renderDashboard === 'function') renderDashboard();
  }

  function chooseNonPresidencia(select) {
    if (!select) return '';
    const option = Array.from(select.options || []).find((o) => o.value && !isPresidencia(o.value));
    return option ? option.value : '';
  }

  function applyToPnl(render = false) {
    const parent = document.getElementById('groupAreaSelect');
    const child = document.getElementById('childSelect');
    const areaMonth = document.getElementById('areaMonth');
    const pnlGroup = document.getElementById('pnlGroup');
    const pnlMonth = document.getElementById('pnlMonth');

    if (filters.month) {
      setSelect(areaMonth, String(filters.month));
      setSelect(pnlMonth, String(filters.month));
    }

    if (filters.group && hasOption(parent, filters.group)) {
      parent.value = filters.group;
      if (typeof updateChildSelect === 'function') updateChildSelect();
      if (child) child.value = '';
      setSelect(pnlGroup, filters.group);
    } else if (!filters.includePresidencia && parent && isPresidencia(parent.value)) {
      const replacement = chooseNonPresidencia(parent);
      if (replacement) {
        parent.value = replacement;
        if (typeof updateChildSelect === 'function') updateChildSelect();
        if (child) child.value = '';
      }
    }

    if (render && document.getElementById('page-area')?.classList.contains('active') && typeof renderArea === 'function') {
      renderArea();
    }
  }

  function compareRowGroup(row, level) {
    const cells = row ? row.querySelectorAll('td') : [];
    if (!cells.length) return '';
    if (level === 'area') return String(cells[1]?.textContent || '').trim();
    return String(cells[0]?.textContent || '').trim();
  }

  function filterCompareRows() {
    const table = document.getElementById('compareTable');
    const level = document.getElementById('compareLevel')?.value || 'group';
    if (!table) return;
    table.querySelectorAll('tbody tr').forEach((row) => {
      const rowGroup = compareRowGroup(row, level);
      const matchesGroup = !filters.group || rowGroup === filters.group;
      const matchesPresidencia = filters.includePresidencia || !isPresidencia(rowGroup);
      row.style.display = matchesGroup && matchesPresidencia ? '' : 'none';
    });
  }

  function applyToCompare(render = false) {
    const level = document.getElementById('compareLevel');
    const group = document.getElementById('compareGroup');
    const month = document.getElementById('compareMonth');

    if (filters.month) setSelect(month, String(filters.month));

    if (filters.group && hasOption(group, filters.group)) {
      if (level) level.value = 'area';
      group.disabled = false;
      group.value = filters.group;
    } else {
      if (level) level.value = 'group';
      if (group && hasOption(group, '')) group.value = '';
    }

    if (render && document.getElementById('page-compare')?.classList.contains('active') && typeof renderCompare === 'function') {
      renderCompare();
    }
    setTimeout(filterCompareRows, 0);
  }

  function applyEverywhere(renderActive = false) {
    if (syncing) return;
    syncing = true;
    try {
      applyToPnl(renderActive);
      applyToCompare(renderActive);
      saveFilters();
    } finally {
      syncing = false;
    }
  }

  function syncFromDashboard() {
    if (syncing) return;
    const next = dashboardValues();
    filters.group = next.group;
    filters.month = next.month;
    filters.includePresidencia = next.includePresidencia;
    saveFilters();
    applyEverywhere(false);
  }

  function installDashboardHooks() {
    const group = document.getElementById('dashGroup');
    const month = document.getElementById('dashMonth');
    const reset = document.getElementById('dashReset');

    if (group && !group.dataset.globalFilterHook) {
      group.dataset.globalFilterHook = '1';
      const original = group.onchange;
      group.onchange = function (event) {
        if (original) original.call(this, event);
        syncFromDashboard();
      };
    }

    if (month && !month.dataset.globalFilterHook) {
      month.dataset.globalFilterHook = '1';
      const original = month.onchange;
      month.onchange = function (event) {
        if (original) original.call(this, event);
        syncFromDashboard();
      };
    }

    document.querySelectorAll('#dashPresidencyToggle [data-pres-mode]').forEach((button) => {
      if (button.dataset.globalFilterHook) return;
      button.dataset.globalFilterHook = '1';
      const original = button.onclick;
      button.onclick = function (event) {
        if (original) original.call(this, event);
        setTimeout(syncFromDashboard, 0);
      };
    });

    if (reset && !reset.dataset.globalFilterHook) {
      reset.dataset.globalFilterHook = '1';
      const original = reset.onclick;
      reset.onclick = function (event) {
        if (original) original.call(this, event);
        setTimeout(syncFromDashboard, 0);
      };
    }
  }

  function installPnlHooks() {
    const parent = document.getElementById('groupAreaSelect');
    const month = document.getElementById('areaMonth');

    if (parent && !parent.dataset.globalFilterHook) {
      parent.dataset.globalFilterHook = '1';
      const original = parent.onchange;
      parent.onchange = function (event) {
        if (original) original.call(this, event);
        if (syncing) return;
        filters.group = String(parent.value || '');
        filters.includePresidencia = !isPresidencia(filters.group) || filters.includePresidencia;
        writeFiltersToDashboard(true);
        applyToCompare(false);
        saveFilters();
      };
    }

    if (month && !month.dataset.globalFilterHook) {
      month.dataset.globalFilterHook = '1';
      const original = month.onchange;
      month.onchange = function (event) {
        if (original) original.call(this, event);
        if (syncing) return;
        filters.month = Number(month.value || 0) || filters.month;
        writeFiltersToDashboard(true);
        applyToCompare(false);
        saveFilters();
      };
    }
  }

  function installCompareHooks() {
    const group = document.getElementById('compareGroup');
    const month = document.getElementById('compareMonth');
    const level = document.getElementById('compareLevel');

    [group, month, level].forEach((el) => {
      if (!el || el.dataset.globalFilterHook) return;
      el.dataset.globalFilterHook = '1';
      const original = el.onchange;
      el.onchange = function (event) {
        if (original) original.call(this, event);
        if (syncing) return;

        if (el === month) {
          filters.month = Number(month.value || 0) || filters.month;
          writeFiltersToDashboard(true);
          applyToPnl(false);
        } else if (el === group && level?.value === 'area') {
          filters.group = String(group.value || '');
          writeFiltersToDashboard(true);
          applyToPnl(false);
        }
        saveFilters();
        setTimeout(filterCompareRows, 0);
      };
    });
  }

  function applyStoredOrCurrent() {
    const restored = loadFilters();
    if (restored) {
      writeFiltersToDashboard(true);
    } else {
      const current = dashboardValues();
      filters.group = current.group;
      filters.month = current.month;
      filters.includePresidencia = current.includePresidencia;
      saveFilters();
    }
    applyEverywhere(false);
  }

  function onNavigation() {
    setTimeout(() => {
      installVisualFixes();
      installDashboardHooks();
      installPnlHooks();
      installCompareHooks();
      applyEverywhere(true);
    }, 0);
  }

  function boot() {
    installAreaChartExpansion();
    installVisualFixes();
    installDashboardHooks();
    installPnlHooks();
    installCompareHooks();
    applyStoredOrCurrent();

    document.querySelectorAll('.oec-main-nav button[data-page]').forEach((button) => {
      if (button.dataset.globalNavHook) return;
      button.dataset.globalNavHook = '1';
      button.addEventListener('click', onNavigation);
    });

    const compareTable = document.getElementById('compareTable');
    if (compareTable) {
      new MutationObserver(() => filterCompareRows()).observe(compareTable, { childList: true, subtree: true });
    }

    const main = document.querySelector('main') || document.body;
    new MutationObserver(() => {
      installVisualFixes();
      installDashboardHooks();
      installPnlHooks();
      installCompareHooks();
    }).observe(main, { subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
