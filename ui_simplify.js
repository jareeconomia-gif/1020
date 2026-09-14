(() => {
  'use strict';

  const PAGE_TITLES = {
    dashboard: 'Dashboard',
    area: 'P&L',
    compare: 'Comparativo',
    upload: 'Datos'
  };

  function moneyToNumber(text) {
    const cleaned = String(text || '').replace(/[^0-9.-]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  function formatMoney(n) {
    return '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function installStyles() {
    if (document.getElementById('dbs-four-screen-styles')) return;
    const style = document.createElement('style');
    style.id = 'dbs-four-screen-styles';
    style.textContent = `
      /* DBS · vista ejecutiva de 4 pantallas */
      .oec-main-nav button[data-page="index"],
      .oec-main-nav button[data-page="pnl"]:not([data-four-screen-pnl="1"]),
      .oec-main-nav button[data-page="area"]:not([data-four-screen-pnl="1"]),
      .oec-main-nav button[data-page="catalogs"],
      .oec-main-nav button[data-page="unmapped"] { display:none !important; }

      #page-index, #page-pnl, #page-catalogs, #page-unmapped { display:none !important; }

      .oec-main-nav { gap:30px !important; }
      .oec-main-nav button { color:#FA5000 !important; font-weight:700 !important; }
      .oec-main-nav button.active { color:#161222 !important; }

      /* Dashboard: una sola vista ejecutiva, sin subpestañas */
      #page-dashboard .dash-tabs { display:none !important; }
      #page-dashboard #dash-panel-categorias,
      #page-dashboard #dash-panel-metas,
      #page-dashboard #dash-panel-nomina,
      #page-dashboard #dash-panel-historial { display:none !important; }
      #page-dashboard #dash-panel-resumen { display:block !important; }
      #page-dashboard .dash-toolbar { margin:0 0 26px !important; }
      #page-dashboard .target-dashboard-metrics {
        display:grid !important;
        grid-template-columns:minmax(320px,.95fr) minmax(230px,1fr) minmax(230px,1fr) !important;
        grid-template-rows:auto auto !important;
        gap:16px !important;
        margin:0 0 34px !important;
      }
      #page-dashboard .target-real-group {
        grid-column:1 !important;
        grid-row:1 / span 2 !important;
        border:1px solid #F7C6B2 !important;
        border-radius:28px !important;
        background:#FFF9F6 !important;
        padding:16px 18px !important;
        display:grid !important;
        grid-template-columns:1fr !important;
        gap:10px !important;
      }
      #page-dashboard .target-real-group .metric-block {
        border:0 !important;
        border-radius:0 !important;
        background:#FFFFFF !important;
        min-height:58px !important;
        padding:10px 14px !important;
        overflow:visible !important;
      }
      #page-dashboard .target-real-group .metric-number {
        font-size:26px !important;
        line-height:30px !important;
        white-space:nowrap !important;
        letter-spacing:-.03em !important;
      }
      #page-dashboard .target-real-group .metric-label {
        margin-top:3px !important;
        font-size:10px !important;
        line-height:14px !important;
      }
      #page-dashboard .target-real-group .target-total {
        grid-column:1 !important;
        border-top:0 !important;
        background:#FBF2EE !important;
        padding:14px 16px !important;
        min-height:72px !important;
      }
      #page-dashboard .target-real-group .target-total .metric-number {
        font-size:30px !important;
        line-height:34px !important;
      }
      #page-dashboard .target-budget { grid-column:2; grid-row:1; }
      #page-dashboard .target-vs { grid-column:3; grid-row:1; }
      #page-dashboard .target-consumed { grid-column:3; grid-row:2; }
      #page-dashboard .target-dashboard-metrics > .metric-block {
        border:1px solid #E4E0EF !important;
        border-radius:26px !important;
        min-height:106px !important;
      }

      /* Resumen: solo las dos visualizaciones principales */
      #page-dashboard .target-hidden-summary-zone { display:none !important; }
      #page-dashboard .target-dashboard-charts {
        display:grid !important;
        grid-template-columns:1fr 1fr !important;
        gap:22px !important;
        align-items:start !important;
        margin-top:18px !important;
      }
      #page-dashboard .target-dashboard-charts > .data-zone {
        margin:0 !important;
        min-width:0 !important;
      }
      #page-dashboard .target-dashboard-charts .full-zone { grid-column:auto !important; }
      #page-dashboard #dashCategoryChips { display:none !important; }

      /* P&L: la pantalla con KPIs, tabla y composición por CECO */
      #page-area .split-section-below { display:none !important; }
      #page-area .pnl-layout { grid-template-columns:minmax(0,1fr) 330px !important; gap:20px !important; }

      /* Comparativo: selector ejecutivo + tabla */
      #page-compare .toolbar .control:has(#compareMonth),
      #page-compare .toolbar .control:has(#compareSearch) { display:none !important; }
      #page-compare .toolbar { max-width:640px !important; }

      /* Datos: únicamente carga de balanza y estado */
      #page-upload #uploadKpis,
      #page-upload #uploadKpis + div { display:none !important; }
      #page-upload .upload-zone { max-width:100% !important; }

      @media (max-width:1050px) {
        #page-dashboard .target-dashboard-metrics { grid-template-columns:1fr 1fr !important; grid-template-rows:auto !important; }
        #page-dashboard .target-real-group { grid-column:1 / -1 !important; grid-row:auto !important; }
        #page-dashboard .target-budget,
        #page-dashboard .target-vs,
        #page-dashboard .target-consumed { grid-column:auto !important; grid-row:auto !important; }
        #page-dashboard .target-dashboard-charts { grid-template-columns:1fr !important; }
        #page-area .pnl-layout { grid-template-columns:1fr !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function configureNavigation() {
    const nav = document.querySelector('.oec-main-nav');
    if (!nav) return;

    const buttons = Array.from(nav.querySelectorAll('button[data-page]'));
    buttons.forEach((btn) => {
      const page = btn.dataset.page;

      if (page === 'pnl' || btn.dataset.fourScreenPnl === '1') {
        btn.dataset.page = 'area';
        btn.dataset.fourScreenPnl = '1';
        btn.textContent = 'P&L';
        btn.style.display = '';
        btn.removeAttribute('aria-hidden');
        btn.onclick = () => window.navigate && window.navigate('area');
        return;
      }

      if (page === 'dashboard') {
        btn.textContent = 'Dashboard';
        btn.style.display = '';
        return;
      }
      if (page === 'compare') {
        btn.textContent = 'Comparativo';
        btn.style.display = '';
        return;
      }
      if (page === 'upload') {
        btn.textContent = 'Datos';
        btn.style.display = '';
        return;
      }

      btn.style.display = 'none';
      btn.setAttribute('aria-hidden', 'true');
    });

    const originalArea = buttons.find((b) => b.dataset.page === 'area' && b.dataset.fourScreenPnl !== '1');
    if (originalArea) {
      originalArea.style.display = 'none';
      originalArea.setAttribute('aria-hidden', 'true');
    }
  }

  function activePageKey() {
    if (document.getElementById('page-dashboard')?.classList.contains('active')) return 'dashboard';
    if (document.getElementById('page-area')?.classList.contains('active')) return 'area';
    if (document.getElementById('page-compare')?.classList.contains('active')) return 'compare';
    if (document.getElementById('page-upload')?.classList.contains('active')) return 'upload';
    return null;
  }

  function updatePageTitle() {
    const page = activePageKey();
    const title = document.getElementById('pageTitle');
    if (title && page && PAGE_TITLES[page]) title.textContent = PAGE_TITLES[page];
  }

  function configureDashboardOrder() {
    const page = document.getElementById('page-dashboard');
    const toolbar = page?.querySelector('.dash-toolbar');
    const strip = document.getElementById('dashMetricStrip');
    if (!page || !toolbar || !strip) return;

    if (page.firstElementChild !== toolbar) page.insertBefore(toolbar, page.firstElementChild);
    strip.classList.add('target-dashboard-metrics');
  }

  function rebuildMetricLayout() {
    const strip = document.getElementById('dashMetricStrip');
    if (!strip || strip.querySelector(':scope > .target-real-group')) return;

    const blocks = Array.from(strip.children).filter((el) => el.classList.contains('metric-block'));
    if (!blocks.length) return;

    const byLabel = (label) => blocks.find((el) => (el.querySelector('.metric-label')?.textContent || '').trim().toUpperCase().startsWith(label));
    const real = byLabel('REAL OPEX');
    const payroll = byLabel('NÓMINA');
    const budget = byLabel('PPTO OPEX');
    const vs = byLabel('VS PPTO OPEX');
    const consumed = byLabel('CONSUMIDO');
    if (!real || !payroll) return;

    const group = document.createElement('div');
    group.className = 'target-real-group';
    strip.insertBefore(group, real);
    group.appendChild(real);
    group.appendChild(payroll);

    const total = document.createElement('div');
    total.className = 'metric-block target-total';
    const realValue = moneyToNumber(real.querySelector('.metric-number')?.textContent);
    const payrollValue = moneyToNumber(payroll.querySelector('.metric-number')?.textContent);
    total.innerHTML = `<div class="metric-number">${formatMoney(realValue + payrollValue)}</div><div class="metric-label">TOTAL</div>`;
    group.appendChild(total);

    budget?.classList.add('target-budget');
    vs?.classList.add('target-vs');
    consumed?.classList.add('target-consumed');
  }

  function configureDashboardCharts() {
    const panel = document.getElementById('dash-panel-resumen');
    if (!panel || panel.querySelector('.target-dashboard-charts')) return;

    const categoryZone = document.getElementById('dashTreemap')?.closest('.data-zone');
    const areasZone = document.getElementById('dashRankAreas')?.closest('.data-zone');
    const rankFamiliesZone = document.getElementById('dashRankFamilies')?.closest('.data-zone');
    if (!categoryZone || !areasZone) return;

    rankFamiliesZone?.classList.add('target-hidden-summary-zone');

    const layout = document.createElement('div');
    layout.className = 'target-dashboard-charts';
    const firstLayout = panel.querySelector('.oec-layout');
    if (firstLayout) firstLayout.insertAdjacentElement('beforebegin', layout);
    else panel.appendChild(layout);

    layout.appendChild(areasZone);
    layout.appendChild(categoryZone);

    if (firstLayout && !firstLayout.querySelector('.data-zone:not(.target-hidden-summary-zone)')) firstLayout.style.display = 'none';
  }

  function simplifyCompare() {
    const level = document.getElementById('compareLevel');
    if (level && level.value !== 'area') {
      // La captura ejecutiva compara CECO / Área dentro de un Agrupador Padre.
      // Mantenemos el selector disponible, pero la vista inicia en Agrupador Padre.
    }
  }

  function applyAll() {
    installStyles();
    configureNavigation();
    configureDashboardOrder();
    rebuildMetricLayout();
    configureDashboardCharts();
    simplifyCompare();
    updatePageTitle();

    const active = activePageKey();
    if (!active && typeof window.navigate === 'function') window.navigate('dashboard');
  }

  function boot() {
    applyAll();

    const metricStrip = document.getElementById('dashMetricStrip');
    if (metricStrip) {
      new MutationObserver(() => {
        configureDashboardOrder();
        rebuildMetricLayout();
      }).observe(metricStrip, { childList: true });
    }

    const main = document.querySelector('main') || document.body;
    new MutationObserver(() => {
      configureNavigation();
      updatePageTitle();
    }).observe(main, { subtree: true, attributes: true, attributeFilter: ['class'] });

    document.addEventListener('click', () => setTimeout(() => {
      configureNavigation();
      configureDashboardOrder();
      rebuildMetricLayout();
      updatePageTitle();
    }, 0));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
