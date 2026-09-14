(() => {
  'use strict';

  function openCategoryFromBar(row) {
    const family = row?.dataset?.family || '';
    if (!family) return;

    try {
      if (typeof dashCategory !== 'undefined') dashCategory = family;
      if (typeof switchDashTab === 'function') switchDashTab('categorias');
      if (typeof renderDashboard === 'function') renderDashboard();
    } catch (err) {
      console.error('DBS category click error:', err);
    }

    const page = document.getElementById('page-dashboard');
    const panel = document.getElementById('dash-panel-categorias');
    if (!page || !panel) return;

    page.classList.add('category-detail-open');
    panel.classList.add('active');

    document.querySelectorAll('#dashTreemap .dash-bar-row').forEach((item) => {
      item.classList.toggle('is-selected', item.dataset.family === family);
    });

    requestAnimationFrame(() => {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  document.addEventListener('click', (event) => {
    const row = event.target?.closest?.('#dashTreemap .dash-bar-row[data-family]');
    if (!row) return;
    event.preventDefault();
    event.stopPropagation();
    openCategoryFromBar(row);
  }, true);
})();
