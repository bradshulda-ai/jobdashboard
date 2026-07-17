(function () {
  const CONFIG = window.JOB_DASHBOARD_CONFIG || {};
  const LAST_VISIT_KEY = 'jobDashboard.lastVisit';

  const state = {
    rows: [],
    activeTab: 'strong_match',
    search: '',
    minFit: 0,
    salaryListedOnly: false,
    location: '',
    sortBy: 'newest',
  };

  const cardList = document.getElementById('cardList');
  const lastUpdatedEl = document.getElementById('lastUpdated');

  function fetchRows() {
    const url = `${CONFIG.APPS_SCRIPT_URL}?token=${encodeURIComponent(CONFIG.TOKEN)}`;
    cardList.innerHTML = '<p class="empty-state">Loading…</p>';
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          cardList.innerHTML = `<p class="empty-state">Error: ${escapeHtml(data.error)}</p>`;
          return;
        }
        state.rows = (data.rows || []).map(normalizeRow);
        lastUpdatedEl.textContent = `Loaded ${new Date().toLocaleString()}`;
        render();
      })
      .catch((err) => {
        cardList.innerHTML = `<p class="empty-state">Failed to load: ${escapeHtml(String(err))}</p>`;
      });
  }

  function normalizeRow(r) {
    const hasFit = r.fit_score !== '' && r.fit_score !== undefined && r.fit_score !== null;
    return Object.assign({}, r, {
      fit_score: hasFit ? Number(r.fit_score) : null,
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function isSalaryListed(salary) {
    return !!salary && !/not listed/i.test(salary);
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const now = new Date();
    return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  }

  function getLastVisit() {
    return localStorage.getItem(LAST_VISIT_KEY);
  }

  function setLastVisitNow() {
    localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
  }

  function applyFilters(rows) {
    return rows.filter((r) => {
      if (state.search) {
        const q = state.search.toLowerCase();
        const hay = `${r.title || ''} ${r.org || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (state.minFit > 0 && (r.fit_score === null || r.fit_score < state.minFit)) return false;
      if (state.salaryListedOnly && !isSalaryListed(r.salary)) return false;
      if (state.location) {
        const loc = (r.location || '').toLowerCase();
        if (!loc.includes(state.location.toLowerCase())) return false;
      }
      return true;
    });
  }

  function sortRows(rows) {
    const sorted = rows.slice();
    if (state.sortBy === 'fit') {
      sorted.sort((a, b) => (b.fit_score || 0) - (a.fit_score || 0));
    } else {
      sorted.sort((a, b) => new Date(b.date_first_seen || 0) - new Date(a.date_first_seen || 0));
    }
    return sorted;
  }

  function cardHtml(r, opts) {
    opts = opts || {};
    const lastVisit = getLastVisit();
    const isNew = lastVisit && r.date_first_seen && new Date(r.date_first_seen) > new Date(lastVisit);
    const deadlineDays = daysUntil(r.deadline);
    const salaryClass = isSalaryListed(r.salary) ? '' : 'warn';

    return `
      <div class="card ${opts.archived ? 'archived' : ''}">
        ${isNew ? '<span class="badge new">New</span>' : ''}
        <p class="card-title">${escapeHtml(r.title || 'Untitled role')}</p>
        <p class="card-org">${escapeHtml(r.org || '')}${r.location ? ' · ' + escapeHtml(r.location) : ''}</p>
        <div class="badge-row">
          ${r.fit_score !== null ? `<span class="badge">Fit ${escapeHtml(r.fit_score)}/10</span>` : ''}
          <span class="badge ${salaryClass}">${escapeHtml(r.salary || '⚠️ Salary not listed')}</span>
          ${opts.archived ? `<span class="badge warn">${escapeHtml(labelForStatus(r.status))}</span>` : ''}
          ${deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 7 ? `<span class="badge warn">Deadline in ${deadlineDays}d</span>` : ''}
        </div>
        ${r.take ? `<p class="take">${escapeHtml(r.take)}</p>` : ''}
        <div class="card-footer">
          <span>${escapeHtml(r.verification_status || '')}</span>
          ${r.url ? `<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener">View posting →</a>` : ''}
        </div>
      </div>
    `;
  }

  function labelForStatus(status) {
    return { closed: 'Closed', below_comp_floor: 'Below comp floor', excluded_scope: 'Excluded on scope' }[status] || status;
  }

  function render() {
    const filtered = applyFilters(state.rows);

    if (state.activeTab === 'archive') {
      renderArchive(filtered);
      return;
    }

    const rows = sortRows(filtered.filter((r) => r.status === 'active' && r.section === state.activeTab));
    if (rows.length === 0) {
      cardList.innerHTML = '<p class="empty-state">No roles here right now.</p>';
      return;
    }
    cardList.innerHTML = rows.map((r) => cardHtml(r)).join('');
    setLastVisitNow();
  }

  function renderArchive(filtered) {
    const groups = [
      ['closed', 'Closed / removed'],
      ['below_comp_floor', 'Below comp floor'],
      ['excluded_scope', 'Excluded on scope'],
    ];
    let html = '';
    groups.forEach(([status, label]) => {
      const rows = sortRows(filtered.filter((r) => r.status === status));
      if (rows.length === 0) return;
      html += `<div class="archive-section-label">${label}</div>`;
      html += rows.map((r) => cardHtml(r, { archived: true })).join('');
    });
    cardList.innerHTML = html || '<p class="empty-state">Nothing archived yet.</p>';
  }

  document.getElementById('tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');
    state.activeTab = btn.dataset.tab;
    render();
  });

  document.getElementById('searchInput').addEventListener('input', (e) => {
    state.search = e.target.value;
    render();
  });
  document.getElementById('minFit').addEventListener('change', (e) => {
    state.minFit = Number(e.target.value);
    render();
  });
  document.getElementById('salaryListedOnly').addEventListener('change', (e) => {
    state.salaryListedOnly = e.target.checked;
    render();
  });
  document.getElementById('locationInput').addEventListener('input', (e) => {
    state.location = e.target.value;
    render();
  });
  document.getElementById('sortBy').addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    render();
  });
  document.getElementById('refreshBtn').addEventListener('click', fetchRows);

  fetchRows();
})();
