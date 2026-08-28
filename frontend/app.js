/* ═══════════════════════════════════════════════════════════════
   ChronosAI — SPA Application
   REST-first, no WebSocket. Each page fetches from the API.
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ─── API helper ──────────────────────────────────────────────────
async function api(path, method = 'GET', body = null) {
  const opts = { method, headers: {} };
  if (body) {
    opts.body = JSON.stringify(body);
    opts.headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  if (method === 'DELETE') return null;
  return res.json();
}

// ─── Toast ───────────────────────────────────────────────────────
function toast(msg, type = 'info', duration = 3500) {
  const tc = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: 'check-circle', error: 'x-circle', info: 'info' };
  const icon = icons[type] || 'info';
  el.innerHTML = `<i data-feather="${icon}" style="width:16px;height:16px;"></i><span>${msg}</span>`;
  tc.appendChild(el);
  if (window.feather) feather.replace();
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(30px)';
    el.style.transition = '0.3s'; setTimeout(() => el.remove(), 300); }, duration);
}

// ─── Modal ───────────────────────────────────────────────────────
const Modal = {
  open({ title, body, footer = '', large = false }) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML   = body;
    document.getElementById('modal-footer').innerHTML = footer;
    const box = document.getElementById('modal-box');
    box.classList.toggle('modal-lg', !!large);
    document.getElementById('modal-overlay').classList.add('open');
  },
  close() { document.getElementById('modal-overlay').classList.remove('open'); },
};
document.getElementById('modal-close').addEventListener('click', Modal.close);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) Modal.close();
});

// ─── Router ──────────────────────────────────────────────────────
const PAGES = {
  dashboard:       renderDashboard,
  inventory:       renderInventory,
  recommendations: renderRecommendations,
  operations:      renderOperations,
  products:        renderProducts,
  warehouses:      renderWarehouses,
};

let currentPage = 'dashboard';

function navigate(page) {
  if (!PAGES[page]) page = 'dashboard';
  currentPage = page;
  // Update nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.id === `nav-${page}`);
  });
  showLoading();
  PAGES[page]().catch(err => {
    content().innerHTML = `<div class="page-loading"><p style="color:var(--critical)">Error: ${err.message}</p></div>`;
  });
}

function content() { return document.getElementById('main-content'); }
function showLoading() {
  content().innerHTML = '<div class="page-loading"><div class="spinner"></div><p>Loading…</p></div>';
}

// Handle hash changes
window.addEventListener('hashchange', () => {
  const page = location.hash.slice(1) || 'dashboard';
  navigate(page);
});

// ─── Formatting helpers ───────────────────────────────────────────
function fmt(n, dec = 0) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: dec });
}
function fmtCur(n) {
  if (n == null) return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
function fmtDate(s) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function daysFromNow(dateStr) {
  if (!dateStr) return null;
  const diff = Math.round((new Date(dateStr) - new Date()) / 86400000);
  return diff;
}
function expiryPill(days) {
  if (days === null) return '<span class="text-muted">—</span>';
  if (days < 0)  return `<span class="expiry-pill es">Expired</span>`;
  if (days <= 2) return `<span class="expiry-pill ec">${days}d</span>`;
  if (days <= 5) return `<span class="expiry-pill eh">${days}d</span>`;
  if (days <= 10) return `<span class="expiry-pill em">${days}d</span>`;
  return `<span class="expiry-pill el">${days}d</span>`;
}
function rowClass(days) {
  if (days <= 2) return 'row-critical';
  if (days <= 5) return 'row-high';
  return '';
}
function badge(type, label) {
  return `<span class="badge badge-${type}">${label || type}</span>`;
}
function actionBadge(type) {
  const labels = {
    redistribute:  '<i data-feather="repeat" style="width:12px;height:12px"></i> Redistribute',
    discount:      '<i data-feather="tag" style="width:12px;height:12px"></i> Discount',
    reorder:       '<i data-feather="shopping-cart" style="width:12px;height:12px"></i> Reorder',
    priority_ship: '<i data-feather="zap" style="width:12px;height:12px"></i> Priority Ship',
    hold:          '<i data-feather="pause-circle" style="width:12px;height:12px"></i> Hold',
  };
  return badge(type, labels[type] || type);
}
function urgencyBadge(u) {
  const labels = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
  return badge(u, labels[u] || u);
}

// ═══════════════════════════════════════════════════════════════
//  GLOBAL UTILS
// ═══════════════════════════════════════════════════════════════

async function resetDatabase() {
  if (!confirm("Are you sure you want to reset the mock database? This will clear all data and re-seed it with fresh mock data.")) return;
  toast("Resetting database, please wait...", "info", 5000);
  try {
    const btn = document.querySelector('.sidebar-footer .btn');
    if(btn) { btn.disabled = true; btn.textContent = 'Resetting...'; }
    await api('/api/dev/reset', 'POST');
    toast("Database reset successfully!", "success");
    setTimeout(() => location.reload(), 1000);
  } catch (e) {
    toast("Reset failed: " + e.message, 'error');
    const btn = document.querySelector('.sidebar-footer .btn');
    if(btn) { btn.disabled = false; btn.textContent = 'Reset Mock DB'; }
  }
}

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════

async function renderDashboard() {
  const [kpis, expiring, recs] = await Promise.all([
    api('/api/dashboard/kpis'),
    api('/api/inventory/expiring?days=7'),
    api('/api/recommendations?status=pending'),
  ]);

  // KPI color map
  const kpiDefs = [
    { label: 'Active Batches',     value: kpis.total_active_batches,     sub: 'Non-expired lots',         icon: '<i data-feather="box"></i>', color: '#3b82f6' },
    { label: 'Expiring ≤ 3 Days',  value: kpis.expiring_within_3_days,   sub: 'Require immediate action', icon: '<i data-feather="clock"></i>', color: kpis.expiring_within_3_days > 0 ? '#ef4444' : '#22c55e' },
    { label: 'Pending Actions',    value: kpis.pending_recommendations,   sub: 'AI recommendations',       icon: '<i data-feather="cpu"></i>', color: '#8b5cf6' },
    { label: 'Savings Unlocked',   value: fmtCur(kpis.estimated_savings_unlocked), sub: 'From accepted recs', icon: '<i data-feather="dollar-sign"></i>', color: '#22c55e', raw: true },
    { label: 'Active Operations',  value: kpis.active_operations,        sub: 'In-flight planned actions', icon: '<i data-feather="refresh-cw"></i>', color: '#f97316' },
  ];

  const kpiHTML = kpiDefs.map(k => `
    <div class="kpi-card" style="--kpi-color:${k.color}">
      <div class="kpi-icon">${k.icon}</div>
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value">${k.raw ? k.value : fmt(k.value)}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>
  `).join('');

  // Alerts
  const alertHTML = expiring.length ? expiring.slice(0, 8).map(b => {
    const days = b.days_until_expiry;
    const cls  = days <= 2 ? '' : days <= 4 ? 'warn' : 'caution';
    return `
      <div class="alert-row ${cls}">
        <div>
          <div class="alert-product">${b.product_name}</div>
          <div class="alert-loc">${b.warehouse_name} · ${b.city} · Batch ${b.batch_no}</div>
        </div>
        <div class="alert-right" style="display:flex;align-items:center;gap:12px">
          <span style="font-size:13px;color:var(--text-secondary)">${fmt(b.quantity, 1)} ${b.unit}</span>
          ${expiryPill(days)}
        </div>
      </div>`;
  }).join('') : '<div style="padding:20px;color:var(--text-muted);text-align:center">No batches expiring within 7 days</div>';

  // Pending recommendations preview
  const recPreview = recs.slice(0, 4).map(r => {
    const detail = r.detail || {};
    return `
      <tr>
        <td>${actionBadge(r.action_type)}</td>
        <td><strong>${r.product_name}</strong></td>
        <td style="color:var(--text-secondary)">${r.from_warehouse_name || '—'}${r.to_warehouse_name ? ' → '+r.to_warehouse_name : ''}</td>
        <td>${urgencyBadge(r.urgency)}</td>
        <td class="text-right">
          <a href="#recommendations" class="btn btn-sm btn-secondary" onclick="navigate('recommendations')">Review</a>
        </td>
      </tr>`;
  }).join('');

  content().innerHTML = `
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <div class="page-subtitle">Food inventory overview · ${new Date().toLocaleDateString('en-IN', {weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
      </div>
      <div class="page-actions" style="display:flex; align-items:center; gap: 16px;">
        <label style="display:flex; align-items:center; gap: 8px; font-weight:600; color:var(--text-secondary); cursor:pointer;">
          <input type="checkbox" id="autopilot-toggle" onchange="toggleAutopilot(this)" ${window._autopilotInterval ? 'checked' : ''} />
          Autopilot Agent
        </label>
        <button class="btn btn-ai btn-lg" onclick="runAnalysisFromDashboard(this)">
          <i data-feather="play-circle" style="width:16px;height:16px;margin-right:4px;"></i> Run AI Analysis
        </button>
      </div>
    </div>
    <div class="page-body">
      <div class="kpi-grid">${kpiHTML}</div>

      <div class="two-col" style="gap:16px">
        <div class="card">
          <div class="card-header">
            <div class="card-title" style="display:flex;align-items:center;gap:6px;"><i data-feather="clock" style="width:16px;height:16px;"></i> Expiry Alerts</div>
            <div class="card-count">Next 7 days · ${expiring.length} batch${expiring.length!==1?'es':''}</div>
          </div>
          <div class="alert-strip">${alertHTML}</div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title" style="display:flex;align-items:center;gap:6px;"><i data-feather="cpu" style="width:16px;height:16px;"></i> Pending AI Recommendations</div>
            <div class="card-count">${recs.length} pending</div>
          </div>
          ${recs.length ? `
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr>
                  <th>Action</th><th>Product</th><th>Route / Location</th><th>Urgency</th><th></th>
                </tr></thead>
                <tbody>${recPreview || '<tr><td colspan="5" class="table-empty">No pending recommendations</td></tr>'}</tbody>
              </table>
            </div>
          ` : `<div style="padding:32px;text-align:center;color:var(--text-muted)">
            <div style="font-size:32px;margin-bottom:10px;display:flex;justify-content:center;"><i data-feather="check-circle" style="width:32px;height:32px"></i></div>
            No pending recommendations.<br>Click <strong>Run AI Analysis</strong> to generate insights.
          </div>`}
        </div>
      </div>
      
      <div class="card" style="margin-top: 16px;">
        <div class="card-header">
          <div class="card-title" style="display:flex;align-items:center;gap:6px;"><i data-feather="activity" style="width:16px;height:16px;"></i> Agent Activity Feed</div>
          <div class="card-count" id="autopilot-status">${window._autopilotInterval ? 'Active · Monitoring...' : 'Offline'}</div>
        </div>
        <div id="agent-feed" style="background:var(--bg-card); font-size:13px; color:var(--text-secondary); padding:16px 24px; min-height:150px; max-height:300px; overflow-y:auto; border-radius:0 0 var(--radius-lg) var(--radius-lg); border-top:1px solid var(--border);">
          ${window._agentLogs ? window._agentLogs.join('<br><br>') : '> Agent offline. Turn on Autopilot to begin autonomous management.'}
        </div>
      </div>
    </div>`;
}

async function runAnalysisFromDashboard(btn) {
  btn.disabled = true; btn.classList.add('loading');
  btn.textContent = '⟳ Analysing…';
  try {
    const res = await api('/api/agent/run', 'POST');
    await updateRecBadge();
    toast(`Analysis complete — ${res.count} recommendation${res.count!==1?'s':''} generated`, 'success');
    navigate('recommendations');
  } catch(e) {
    toast('Analysis failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false; btn.classList.remove('loading');
    btn.textContent = '◎ Run AI Analysis';
  }
}

function toggleAutopilot(cb) {
  const status = document.getElementById('autopilot-status');
  const feed = document.getElementById('agent-feed');
  
  if (!window._agentLogs) window._agentLogs = [];
  
  if (cb.checked) {
    if (status) status.textContent = 'Active — Running evaluation...';
    window._agentLogs.push('> Autopilot engaged. Connecting to Agent API...');
    if (feed) feed.innerHTML = window._agentLogs.join('<br><br>');
    
    // Run immediately, then every 20 seconds
    runAutopilotLoop();
    window._autopilotInterval = setInterval(runAutopilotLoop, 20000);
  } else {
    clearInterval(window._autopilotInterval);
    window._autopilotInterval = null;
    if (status) status.textContent = 'Offline';
    window._agentLogs.push('> Autopilot disengaged.');
    feed.innerHTML = window._agentLogs.join('<br><br>');
    feed.scrollTop = feed.scrollHeight;
  }
}

async function runAutopilotLoop() {
  const feed = document.getElementById('agent-feed');
  try {
    const res = await api('/api/agent/autopilot', 'POST');
    let hasAction = false;
    if (res.status === 'success' && res.logs && res.logs.length) {
      for (const log of res.logs) {
        if (log.action === 'none') {
            window._agentLogs.push(`> Checked inventory. No critical actions needed.`);
        } else if (log.action === 'error') {
            window._agentLogs.push(`<span style="color:var(--critical)">Error: ${log.thought}</span>`);
        } else if (log.action === 'info') {
            window._agentLogs.push(`<span style="color:var(--medium)">Info:</span> ${log.thought}`);
        } else {
            hasAction = true;
            window._agentLogs.push(`<span style="color:var(--low)">Action:</span> ${log.action}<br><span style="color:var(--text-muted)">Thought: ${log.thought}</span>`);
        }
      }
    }
  } catch (e) {
    window._agentLogs.push(`<span style="color:var(--critical)">Error: ${e.message}</span>`);
  }
  
  if (feed) {
    feed.innerHTML = window._agentLogs.join('<br><br>');
    feed.scrollTop = feed.scrollHeight;
  }
  
  // Refresh recommendations badge automatically
  updateRecBadge();
  
  // Refresh recommendations list if we are on the recommendations page
  let hasActionGlobal = window._agentLogs.some(log => log.includes("Action:"));
  if (document.getElementById('run-analysis-btn')) {
    renderRecommendations();
  }
}


// ═══════════════════════════════════════════════════════════════
//  INVENTORY
// ═══════════════════════════════════════════════════════════════

async function renderInventory() {
  const [batches, products, warehouses] = await Promise.all([
    api('/api/inventory'),
    api('/api/products'),
    api('/api/warehouses'),
  ]);

  const prodOpts = products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  const whOpts   = warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('');

  content().innerHTML = `
    <div class="page-header">
      <div>
        <h1>Inventory Batches</h1>
        <div class="page-subtitle">${batches.length} active batch${batches.length!==1?'es':''}</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="openAddBatch()">+ Add Batch</button>
      </div>
    </div>

    <div class="card" style="margin:16px 32px">
      <div class="filter-bar">
        <span class="filter-label">Filter:</span>
        <select id="filt-prod" onchange="filterBatches()">
          <option value="">All Products</option>${prodOpts}
        </select>
        <select id="filt-wh" onchange="filterBatches()">
          <option value="">All Warehouses</option>${whOpts}
        </select>
        <select id="filt-exp" onchange="filterBatches()">
          <option value="">Any Expiry</option>
          <option value="2">Expiring ≤ 2 days</option>
          <option value="5">Expiring ≤ 5 days</option>
          <option value="10">Expiring ≤ 10 days</option>
        </select>
        <input id="filt-search" type="text" placeholder="Search batch no…" oninput="filterBatches()" />
      </div>

      <div class="table-wrap">
        <table class="data-table" id="batch-table">
          <thead><tr>
            <th>Product</th>
            <th>Category</th>
            <th>Warehouse</th>
            <th>Batch No</th>
            <th>Quantity</th>
            <th>Received</th>
            <th>Expiry Date</th>
            <th>Days Left</th>
            <th>Cost/Unit</th>
            <th></th>
          </tr></thead>
          <tbody id="batch-tbody">
            ${buildBatchRows(batches)}
          </tbody>
        </table>
      </div>
    </div>`;

  // Store for filtering
  window._batches = batches;
}

function buildBatchRows(rows) {
  if (!rows.length) return `<tr><td colspan="10" class="table-empty"><div class="table-empty-icon"><i data-feather="inbox" style="width:32px;height:32px;"></i></div>No batches found</td></tr>`;
  return rows.map(b => {
    const days = b.days_until_expiry;
    return `<tr class="${rowClass(days)}" data-bid="${b.id}">
      <td><strong>${b.product_name}</strong></td>
      <td><span style="font-size:11px;color:var(--text-muted)">${b.category || '—'}</span></td>
      <td>${b.warehouse_name}<br><span style="font-size:11px;color:var(--text-muted)">${b.city || ''}</span></td>
      <td class="font-mono">${b.batch_no}</td>
      <td><strong>${fmt(b.quantity, 1)}</strong> <span style="color:var(--text-muted);font-size:11px">${b.unit}</span></td>
      <td style="color:var(--text-secondary);font-size:12px">${fmtDate(b.received_date)}</td>
      <td style="font-size:12px">${fmtDate(b.expiry_date)}</td>
      <td>${expiryPill(days)}</td>
      <td style="color:var(--text-secondary)">${fmtCur(b.cost_per_unit)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-icon btn-sm" title="Edit" onclick="openEditBatch(${b.id})">✎</button>
          <button class="btn btn-danger btn-icon btn-sm" title="Delete" onclick="deleteBatch(${b.id})">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function filterBatches() {
  const pid    = document.getElementById('filt-prod').value;
  const wid    = document.getElementById('filt-wh').value;
  const expMax = document.getElementById('filt-exp').value;
  const search = document.getElementById('filt-search').value.toLowerCase();
  let rows = window._batches || [];
  if (pid)    rows = rows.filter(b => String(b.product_id) === pid);
  if (wid)    rows = rows.filter(b => String(b.warehouse_id) === wid);
  if (expMax) rows = rows.filter(b => b.days_until_expiry <= parseInt(expMax));
  if (search) rows = rows.filter(b => b.batch_no.toLowerCase().includes(search));
  document.getElementById('batch-tbody').innerHTML = buildBatchRows(rows);
}

async function openAddBatch() {
  const [products, warehouses] = await Promise.all([api('/api/products'), api('/api/warehouses')]);
  const today = new Date().toISOString().slice(0,10);
  Modal.open({
    title: 'Add Inventory Batch',
    body: `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Product *</label>
          <select id="b-product" class="form-select">
            <option value="">Select product…</option>
            ${products.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Warehouse *</label>
          <select id="b-warehouse" class="form-select">
            <option value="">Select warehouse…</option>
            ${warehouses.map(w=>`<option value="${w.id}">${w.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Batch Number *</label>
          <input id="b-batch_no" class="form-input" placeholder="e.g. BCH-MUM-001" />
        </div>
        <div class="form-group">
          <label class="form-label">Quantity *</label>
          <input id="b-quantity" class="form-input" type="number" min="0" step="0.1" placeholder="0.0" />
        </div>
        <div class="form-group">
          <label class="form-label">Manufacture Date</label>
          <input id="b-manufacture_date" class="form-input" type="date" max="${today}" />
        </div>
        <div class="form-group">
          <label class="form-label">Expiry Date *</label>
          <input id="b-expiry_date" class="form-input" type="date" min="${today}" />
        </div>
        <div class="form-group">
          <label class="form-label">Cost per Unit (₹)</label>
          <input id="b-cost_per_unit" class="form-input" type="number" min="0" step="0.01" placeholder="0.00" />
        </div>
        <div class="form-group">
          <label class="form-label">Received Date</label>
          <input id="b-received_date" class="form-input" type="date" value="${today}" />
        </div>
        <div class="form-group span2">
          <label class="form-label">Notes</label>
          <textarea id="b-notes" class="form-textarea" placeholder="Optional notes…"></textarea>
        </div>
      </div>`,
    footer: `<button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
             <button class="btn btn-primary" onclick="submitAddBatch()">Add Batch</button>`,
  });
}

async function submitAddBatch() {
  const body = {
    product_id:       parseInt(document.getElementById('b-product').value),
    warehouse_id:     parseInt(document.getElementById('b-warehouse').value),
    batch_no:         document.getElementById('b-batch_no').value.trim(),
    quantity:         parseFloat(document.getElementById('b-quantity').value),
    manufacture_date: document.getElementById('b-manufacture_date').value || null,
    expiry_date:      document.getElementById('b-expiry_date').value,
    cost_per_unit:    parseFloat(document.getElementById('b-cost_per_unit').value) || 0,
    received_date:    document.getElementById('b-received_date').value || null,
    notes:            document.getElementById('b-notes').value,
  };
  if (!body.product_id || !body.warehouse_id || !body.batch_no || !body.expiry_date || isNaN(body.quantity)) {
    toast('Please fill all required fields', 'error'); return;
  }
  try {
    await api('/api/inventory', 'POST', body);
    Modal.close(); toast('Batch added', 'success'); navigate('inventory');
  } catch(e) { toast(e.message, 'error'); }
}

async function openEditBatch(bid) {
  const [b, products, warehouses] = await Promise.all([
    api(`/api/inventory/${bid}`), api('/api/products'), api('/api/warehouses'),
  ]);
  Modal.open({
    title: 'Edit Batch',
    body: `
      <div class="form-grid">
        <div class="form-group span2">
          <label class="form-label">Batch Number</label>
          <input id="eb-batch_no" class="form-input" value="${b.batch_no}" />
        </div>
        <div class="form-group">
          <label class="form-label">Quantity</label>
          <input id="eb-quantity" class="form-input" type="number" min="0" step="0.1" value="${b.quantity}" />
        </div>
        <div class="form-group">
          <label class="form-label">Cost/Unit (₹)</label>
          <input id="eb-cost_per_unit" class="form-input" type="number" step="0.01" value="${b.cost_per_unit}" />
        </div>
        <div class="form-group">
          <label class="form-label">Manufacture Date</label>
          <input id="eb-manufacture_date" class="form-input" type="date" value="${b.manufacture_date || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Expiry Date</label>
          <input id="eb-expiry_date" class="form-input" type="date" value="${b.expiry_date}" />
        </div>
        <div class="form-group span2">
          <label class="form-label">Notes</label>
          <textarea id="eb-notes" class="form-textarea">${b.notes || ''}</textarea>
        </div>
      </div>`,
    footer: `<button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
             <button class="btn btn-primary" onclick="submitEditBatch(${bid})">Save Changes</button>`,
  });
}

async function submitEditBatch(bid) {
  const body = {};
  ['batch_no','quantity','manufacture_date','expiry_date','cost_per_unit','notes'].forEach(k => {
    const el = document.getElementById(`eb-${k}`);
    if (el) body[k] = k === 'quantity' || k === 'cost_per_unit' ? parseFloat(el.value) : el.value;
  });
  try {
    await api(`/api/inventory/${bid}`, 'PUT', body);
    Modal.close(); toast('Batch updated', 'success'); navigate('inventory');
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteBatch(bid) {
  if (!confirm('Delete this batch? This cannot be undone.')) return;
  try {
    await api(`/api/inventory/${bid}`, 'DELETE');
    toast('Batch deleted', 'success'); navigate('inventory');
  } catch(e) { toast(e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════════
//  AI RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════

let _recTab = 'pending';

async function renderRecommendations() {
  const [pending, accepted, rejected] = await Promise.all([
    api('/api/recommendations?status=pending'),
    api('/api/recommendations?status=accepted'),
    api('/api/recommendations?status=rejected'),
  ]);

  const all = { pending, accepted, rejected };
  const cur = all[_recTab] || [];

  content().innerHTML = `
    <div class="page-header">
      <div>
        <h1>AI Recommendations</h1>
        <div class="page-subtitle">On-demand analysis of inventory risk and opportunities</div>
      </div>
      <div class="page-actions" style="display:flex; align-items:center; gap: 16px;">
        <label style="display:flex; align-items:center; gap: 8px; font-weight:600; color:var(--text-secondary); cursor:pointer;">
          <input type="checkbox" id="autopilot-toggle" onchange="toggleAutopilot(this)" ${window._autopilotInterval ? 'checked' : ''} />
          Agentic Mode (Autopilot)
        </label>
        <button class="btn btn-ai btn-lg" id="run-analysis-btn" onclick="runAnalysis(this)">
          <i data-feather="play-circle" style="width:16px;height:16px;margin-right:4px;"></i> Run Analysis
        </button>
      </div>
    </div>

    <div class="tab-bar">
      <button class="tab-btn ${_recTab==='pending'?'active':''}"  onclick="switchRecTab('pending')">
        Pending <span class="nav-badge" style="display:inline;position:static;margin-left:4px">${pending.length}</span>
      </button>
      <button class="tab-btn ${_recTab==='accepted'?'active':''}" onclick="switchRecTab('accepted')">Accepted (${accepted.length})</button>
      <button class="tab-btn ${_recTab==='rejected'?'active':''}" onclick="switchRecTab('rejected')">Rejected (${rejected.length})</button>
    </div>

    <div class="page-body" id="rec-content">
      ${renderRecCards(cur, _recTab)}
    </div>`;

  await updateRecBadge();
}

function switchRecTab(tab) {
  _recTab = tab;
  renderRecommendations();
}

function renderRecCards(recs, tab) {
  if (!recs.length) {
    return `<div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
      <div style="font-size:48px;margin-bottom:12px;display:flex;justify-content:center;"><i data-feather="inbox" style="width:48px;height:48px;"></i></div>
      <div style="font-size:15px;margin-bottom:6px">No ${tab} recommendations</div>
      ${tab === 'pending' ? '<p>Click <strong>Run Analysis</strong> above to generate AI recommendations.</p>' : ''}
    </div>`;
  }
  return `<div class="rec-grid">${recs.map((r, i) => buildRecCard(r, tab, i + 1)).join('')}</div>`;
}

function buildRecCard(r, tab, index) {
  const detail = r.detail || {};
  const isPending = tab === 'pending';

  // Metrics
  const qty    = r.quantity != null ? `${fmt(r.quantity, 1)} ${r.unit || ''}` : '—';
  const saving = r.estimated_saving > 0 ? fmtCur(r.estimated_saving) : '—';
  const cost   = r.estimated_cost   > 0 ? fmtCur(r.estimated_cost)   : '—';

  let routeHTML = '';
  if (r.from_warehouse_name) {
    routeHTML = `<div class="rec-route">
      <span>${r.from_warehouse_name}</span>
      ${r.to_warehouse_name ? `<span class="arrow">→</span><span>${r.to_warehouse_name}</span>` : ''}
    </div>`;
  }

  let metricsHTML = `
    <div class="rec-metrics">
      <div class="rec-metric">
        <div class="rec-metric-label">Quantity</div>
        <div class="rec-metric-value blue">${qty}</div>
      </div>
      ${r.estimated_saving > 0 ? `<div class="rec-metric">
        <div class="rec-metric-label">Est. Saving</div>
        <div class="rec-metric-value green">${saving}</div>
      </div>` : ''}
      ${r.estimated_cost > 0 ? `<div class="rec-metric">
        <div class="rec-metric-label">Est. Cost</div>
        <div class="rec-metric-value">${cost}</div>
      </div>` : ''}
      ${detail.transit_days != null ? `<div class="rec-metric">
        <div class="rec-metric-label">Transit</div>
        <div class="rec-metric-value">${detail.transit_days}d</div>
      </div>` : ''}
      ${detail.discount_pct != null ? `<div class="rec-metric">
        <div class="rec-metric-label">Discount</div>
        <div class="rec-metric-value red">${detail.discount_pct}%</div>
      </div>` : ''}
    </div>`;

  let actionsHTML = '';
  if (isPending) {
    actionsHTML = `<div class="rec-actions">
      <button class="btn btn-success" onclick="acceptRec(${r.id})"><i data-feather="check" style="width:14px;height:14px;margin-right:4px;"></i> Accept</button>
      <button class="btn btn-danger"  onclick="openRejectRec(${r.id})"><i data-feather="x" style="width:14px;height:14px;margin-right:4px;"></i> Reject</button>
    </div>`;
  } else {
    const label = tab === 'accepted'
      ? `<div class="rec-resolve-note">${badge('accepted','<i data-feather="check" style="width:12px;height:12px;margin-right:2px;"></i> Accepted')} ${r.resolved_at ? '· '+fmtDate(r.resolved_at) : ''}</div>`
      : `<div class="rec-resolve-note">${badge('rejected','<i data-feather="x" style="width:12px;height:12px;margin-right:2px;"></i> Rejected')} ${r.rejection_reason ? '· "'+r.rejection_reason+'"' : ''}</div>`;
    actionsHTML = label;
  }

  return `
    <div class="rec-card ${tab !== 'pending' ? tab : ''}" id="rec-${r.id}">
      <div class="rec-card-header">
        <div class="rec-badges">
          ${actionBadge(r.action_type)}
          ${urgencyBadge(r.urgency)}
        </div>
        <span style="font-size:11px;color:var(--text-muted)">#${index}</span>
      </div>
      <div>
        <div class="rec-product">${r.product_name || '—'}</div>
        ${routeHTML}
      </div>
      ${metricsHTML}
      <div class="rec-reason">${detail.reason || '—'}</div>
      ${actionsHTML}
    </div>`;
}

async function runAnalysis(btn) {
  btn.disabled = true; btn.classList.add('loading');
  const orig = btn.textContent;
  btn.textContent = '⟳ Analysing inventory…';
  try {
    const res = await api('/api/agent/run', 'POST');
    await updateRecBadge();
    toast(`Analysis complete — ${res.count} recommendation${res.count!==1?'s':''} generated`, 'success');
    _recTab = 'pending';
    renderRecommendations();
  } catch(e) {
    toast('Analysis failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false; btn.classList.remove('loading');
    btn.textContent = orig;
  }
}

async function acceptRec(rid) {
  try {
    const res = await api(`/api/recommendations/${rid}/accept`, 'PUT');
    toast(`Recommendation accepted — Operation #${res.operation?.id} created`, 'success');
    await updateRecBadge();
    renderRecommendations();
  } catch(e) { toast(e.message, 'error'); }
}

function openRejectRec(rid) {
  Modal.open({
    title: 'Reject Recommendation',
    body: `
      <p style="color:var(--text-secondary);margin-bottom:14px">Optionally provide a reason for rejecting this recommendation.</p>
      <div class="form-group">
        <label class="form-label">Reason (optional)</label>
        <textarea id="reject-reason" class="form-textarea" placeholder="e.g. Already handled manually, wrong data…"></textarea>
      </div>`,
    footer: `<button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
             <button class="btn btn-danger" onclick="submitReject(${rid})">Confirm Reject</button>`,
  });
}

async function submitReject(rid) {
  const reason = document.getElementById('reject-reason').value.trim();
  try {
    await api(`/api/recommendations/${rid}/reject`, 'PUT', { reason });
    Modal.close();
    toast('Recommendation rejected', 'info');
    await updateRecBadge();
    renderRecommendations();
  } catch(e) { toast(e.message, 'error'); }
}

async function updateRecBadge() {
  try {
    const pending = await api('/api/recommendations?status=pending');
    const badge   = document.getElementById('rec-badge');
    if (badge) {
      badge.textContent = pending.length;
      badge.style.display = pending.length ? 'inline' : 'none';
    }
  } catch(_) {}
}

// ═══════════════════════════════════════════════════════════════
//  OPERATIONS
// ═══════════════════════════════════════════════════════════════

let _opTab = 'all';

async function renderOperations() {
  const ops = await api('/api/operations');
  window._currentOps = ops;

  const tabs = ['all','transfer','purchase_order','discount_event'];
  const labels = { all:'All', transfer:'Transfers', purchase_order:'Purchase Orders', discount_event:'Discounts' };
  const cur = _opTab === 'all' ? ops : ops.filter(o => o.op_type === _opTab);

  content().innerHTML = `
    <div class="page-header">
      <div>
        <h1>Operations Log</h1>
        <div class="page-subtitle">${ops.length} total operations</div>
      </div>
      <div class="page-actions" style="display:flex; gap:10px">
        <button id="btn-bulk-transit" class="btn btn-secondary btn-sm" onclick="bulkAdvanceOps('in_transit')">→ Mark All In Transit</button>
        <button id="btn-bulk-completed" class="btn btn-success btn-sm" onclick="bulkAdvanceOps('completed')">✓ Mark All Completed</button>
      </div>
    </div>

    <div class="tab-bar">
      ${tabs.map(t=>`<button class="tab-btn ${_opTab===t?'active':''}" onclick="switchOpTab('${t}')">${labels[t]}</button>`).join('')}
    </div>

    <div class="card" style="margin:16px 32px">
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            <th>#</th><th>Type</th><th>Product</th><th>From</th><th>To / Dest</th>
            <th>Qty</th><th>Scheduled</th><th>Est. Cost</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>
            ${cur.length ? cur.map((o, i) => buildOpRow(o, i + 1)).join('') :
              '<tr><td colspan="10" class="table-empty"><div class="table-empty-icon">⟳</div>No operations found. Accept recommendations to create operations.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

function buildOpRow(o, index) {
  let nextStatus = 'in_transit';
  let nextLabel = '→ In Transit';
  if (o.status === 'planned') {
      if (['discount_event', 'hold_note'].includes(o.op_type)) {
          nextStatus = 'completed';
          nextLabel = '✓ Complete';
      }
  } else if (o.status === 'in_transit') {
      nextStatus = 'completed';
      nextLabel = '✓ Complete';
  }

  const transition = o.status !== 'completed' && o.status !== 'cancelled' ? { next: nextStatus, label: nextLabel } : null;
  const opLabel = { transfer: 'Transfer', purchase_order: 'Purchase Order', discount_event: 'Discount', hold_note: 'Hold Note' };

  return `<tr>
    <td class="font-mono" style="color:var(--text-muted)">#${index}</td>
    <td>${badge('badge-'+o.op_type, opLabel[o.op_type] || o.op_type)}</td>
    <td><strong>${o.product_name || '—'}</strong><br><span style="font-size:11px;color:var(--text-muted)">${o.category||''}</span></td>
    <td style="font-size:12px">${o.from_warehouse_name ? o.from_warehouse_name+'<br><span style="color:var(--text-muted)">'+o.from_city+'</span>' : '—'}</td>
    <td style="font-size:12px">${o.to_warehouse_name   ? o.to_warehouse_name+'<br><span style="color:var(--text-muted)">'+o.to_city+'</span>'   : '—'}</td>
    <td>${o.quantity != null ? `<strong>${fmt(o.quantity,1)}</strong> <span style="color:var(--text-muted);font-size:11px">${o.unit||''}</span>` : '—'}</td>
    <td style="font-size:12px;color:var(--text-secondary)">${fmtDate(o.scheduled_date)}</td>
    <td style="color:var(--text-secondary)">${o.estimated_cost > 0 ? fmtCur(o.estimated_cost) : '—'}</td>
    <td>${badge(o.status, o.status.replace('_',' '))}</td>
    <td>
      ${transition ? `<button class="btn btn-sm btn-secondary" onclick="advanceOp(${o.id},'${transition.next}')">${transition.label}</button>` : ''}
      ${o.status === 'planned' ? `<button class="btn btn-sm btn-ghost" onclick="advanceOp(${o.id},'cancelled')" style="margin-left:4px;color:var(--text-muted)">Cancel</button>` : ''}
    </td>
  </tr>`;
}

function switchOpTab(tab) { _opTab = tab; renderOperations(); }

async function advanceOp(oid, newStatus) {
  let actualCost = null;
  if (newStatus === 'completed') {
    const input = prompt('Enter actual cost (₹), or leave blank to use estimate:');
    if (input !== null && input.trim()) actualCost = parseFloat(input);
  }
  if (newStatus === 'cancelled' && !confirm('Cancel this operation?')) return;
  try {
    await api(`/api/operations/${oid}/status`, 'PUT', { status: newStatus, actual_cost: actualCost });
    const labels = { in_transit:'Marked in transit', completed:'Operation completed — inventory updated', cancelled:'Operation cancelled' };
    toast(labels[newStatus] || 'Status updated', newStatus === 'cancelled' ? 'info' : 'success');
    renderOperations();
  } catch(e) { toast(e.message, 'error'); }
}

async function bulkAdvanceOps(newStatus) {
  const ops = window._currentOps || [];
  let applicable = [];
  if (newStatus === 'in_transit') {
    applicable = ops.filter(o => o.status === 'planned' && !['discount_event', 'hold_note'].includes(o.op_type));
  } else if (newStatus === 'completed') {
    applicable = ops.filter(o => o.status === 'in_transit' || (o.status === 'planned' && ['discount_event', 'hold_note'].includes(o.op_type)));
  }
  
  if (applicable.length === 0) {
    toast(`No operations available to mark as ${newStatus.replace('_', ' ')}`, 'info');
    return;
  }
  
  if (!confirm(`Are you sure you want to mark ${applicable.length} operations as ${newStatus.replace('_', ' ')}?`)) {
    return;
  }
  
  const btnInTransit = document.getElementById('btn-bulk-transit');
  const btnCompleted = document.getElementById('btn-bulk-completed');
  if (btnInTransit) btnInTransit.disabled = true;
  if (btnCompleted) btnCompleted.disabled = true;
  
  toast(`Updating ${applicable.length} operations...`, 'info', 2000);
  
  let successCount = 0;
  for (const o of applicable) {
    try {
      await api(`/api/operations/${o.id}/status`, 'PUT', { status: newStatus, actual_cost: null });
      successCount++;
    } catch (e) {
      console.error(e);
    }
  }
  
  toast(`Successfully updated ${successCount} operations to ${newStatus.replace('_', ' ')}`, 'success');
  renderOperations();
}

// ═══════════════════════════════════════════════════════════════
//  PRODUCTS
// ═══════════════════════════════════════════════════════════════

async function renderProducts() {
  const products = await api('/api/products');
  content().innerHTML = `
    <div class="page-header">
      <div>
        <h1>Product Catalogue</h1>
        <div class="page-subtitle">${products.length} product${products.length!==1?'s':''}</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="openAddProduct()">+ Add Product</button>
      </div>
    </div>
    <div class="card" style="margin:16px 32px">
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            <th>Name</th><th>Category</th><th>Unit</th>
            <th>Shelf Life</th><th>Daily Demand</th>
            <th>Reorder Qty</th><th>Lead Time</th>
            <th>Cold Chain</th><th>Cost/Unit</th><th></th>
          </tr></thead>
          <tbody>
            ${products.length ? products.map(p => `
              <tr>
                <td><strong>${p.name}</strong></td>
                <td style="color:var(--text-secondary)">${p.category}</td>
                <td>${p.unit}</td>
                <td>${p.default_shelf_days}d</td>
                <td>${fmt(p.default_daily_demand, 1)} ${p.unit}/day</td>
                <td>${fmt(p.reorder_qty, 0)} ${p.unit}</td>
                <td>${p.supplier_lead_days}d</td>
                <td>${p.requires_cold_chain ? badge('cold','❄ Cold Chain') : badge('warm','Ambient')}</td>
                <td>${fmtCur(p.cost_per_unit)}</td>
                <td>
                  <div style="display:flex;gap:6px">
                    <button class="btn btn-ghost btn-icon btn-sm" onclick="openEditProduct(${p.id})">✎</button>
                    <button class="btn btn-danger btn-icon btn-sm" onclick="deleteProduct(${p.id})">✕</button>
                  </div>
                </td>
              </tr>`).join('') :
              '<tr><td colspan="10" class="table-empty">No products yet</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </div>`;
}

function productForm(p = {}) {
  return `
    <div class="form-grid">
      <div class="form-group span2">
        <label class="form-label">Product Name *</label>
        <input id="p-name" class="form-input" value="${p.name||''}" placeholder="e.g. Fresh Tomatoes" />
      </div>
      <div class="form-group">
        <label class="form-label">Category</label>
        <input id="p-category" class="form-input" value="${p.category||''}" placeholder="e.g. Vegetables" />
      </div>
      <div class="form-group">
        <label class="form-label">Unit</label>
        <select id="p-unit" class="form-select">
          ${['kg','litres','units','grams','pieces'].map(u=>`<option value="${u}"${p.unit===u?' selected':''}>${u}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Default Shelf Life (days)</label>
        <input id="p-default_shelf_days" class="form-input" type="number" min="1" value="${p.default_shelf_days||7}" />
      </div>
      <div class="form-group">
        <label class="form-label">Default Daily Demand</label>
        <input id="p-default_daily_demand" class="form-input" type="number" min="0" step="0.1" value="${p.default_daily_demand||50}" />
      </div>
      <div class="form-group">
        <label class="form-label">Reorder Quantity</label>
        <input id="p-reorder_qty" class="form-input" type="number" min="0" value="${p.reorder_qty||200}" />
      </div>
      <div class="form-group">
        <label class="form-label">Supplier Lead Time (days)</label>
        <input id="p-supplier_lead_days" class="form-input" type="number" min="0" value="${p.supplier_lead_days||3}" />
      </div>
      <div class="form-group">
        <label class="form-label">Cost per Unit (₹)</label>
        <input id="p-cost_per_unit" class="form-input" type="number" min="0" step="0.01" value="${p.cost_per_unit||0}" />
      </div>
      <div class="form-group span2">
        <label class="form-check">
          <input type="checkbox" id="p-requires_cold_chain" ${p.requires_cold_chain ? 'checked' : ''} />
          Requires Cold Chain Storage
        </label>
      </div>
    </div>`;
}

function readProductForm() {
  return {
    name:                 document.getElementById('p-name').value.trim(),
    category:             document.getElementById('p-category').value.trim(),
    unit:                 document.getElementById('p-unit').value,
    default_shelf_days:   parseInt(document.getElementById('p-default_shelf_days').value),
    default_daily_demand: parseFloat(document.getElementById('p-default_daily_demand').value),
    reorder_qty:          parseFloat(document.getElementById('p-reorder_qty').value),
    supplier_lead_days:   parseInt(document.getElementById('p-supplier_lead_days').value),
    cost_per_unit:        parseFloat(document.getElementById('p-cost_per_unit').value) || 0,
    requires_cold_chain:  document.getElementById('p-requires_cold_chain').checked ? 1 : 0,
  };
}

function openAddProduct() {
  Modal.open({
    title: 'Add Product', body: productForm(),
    footer: `<button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
             <button class="btn btn-primary" onclick="submitAddProduct()">Add Product</button>`,
  });
}

async function submitAddProduct() {
  const body = readProductForm();
  if (!body.name) { toast('Product name is required', 'error'); return; }
  try {
    await api('/api/products', 'POST', body);
    Modal.close(); toast('Product added', 'success'); navigate('products');
  } catch(e) { toast(e.message, 'error'); }
}

async function openEditProduct(pid) {
  const p = await api(`/api/products/${pid}`);
  Modal.open({
    title: 'Edit Product', body: productForm(p),
    footer: `<button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
             <button class="btn btn-primary" onclick="submitEditProduct(${pid})">Save Changes</button>`,
  });
}

async function submitEditProduct(pid) {
  const body = readProductForm();
  try {
    await api(`/api/products/${pid}`, 'PUT', body);
    Modal.close(); toast('Product updated', 'success'); navigate('products');
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteProduct(pid) {
  if (!confirm('Delete this product? All related inventory batches will also be removed.')) return;
  try {
    await api(`/api/products/${pid}`, 'DELETE');
    toast('Product deleted', 'info'); navigate('products');
  } catch(e) { toast(e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════════
//  WAREHOUSES
// ═══════════════════════════════════════════════════════════════

async function renderWarehouses() {
  const warehouses = await api('/api/warehouses');
  content().innerHTML = `
    <div class="page-header">
      <div>
        <h1>Warehouses</h1>
        <div class="page-subtitle">${warehouses.length} location${warehouses.length!==1?'s':''}</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="openAddWarehouse()">+ Add Warehouse</button>
      </div>
    </div>
    <div class="page-body">
      <div class="wh-grid">
        ${warehouses.map(w => `
          <div class="wh-card">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px">
              <div class="wh-card-title">${w.name}</div>
              ${w.has_cold_storage ? badge('cold','❄ Cold') : badge('warm','Ambient')}
            </div>
            <div class="wh-card-city">${w.city} · ${w.region}</div>
            <div class="wh-stat-row"><span>Capacity</span><span class="val">${fmt(w.capacity_units)} units</span></div>
            <div class="wh-stat-row"><span>Transport Time</span><span class="val">${w.transport_time_days}d avg</span></div>
            <div class="wh-stat-row"><span>Contact</span><span class="val">${w.contact_person || '—'}</span></div>
            <div class="wh-stat-row"><span>Phone</span><span class="val" style="font-size:11px">${w.contact_phone || '—'}</span></div>
            <div class="wh-actions">
              <button class="btn btn-secondary btn-sm" onclick="openEditWarehouse(${w.id})">✎ Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteWarehouse(${w.id})">✕ Delete</button>
            </div>
          </div>`).join('')
        }
      </div>
    </div>`;
}

function warehouseForm(w = {}) {
  return `
    <div class="form-grid">
      <div class="form-group span2">
        <label class="form-label">Warehouse Name *</label>
        <input id="w-name" class="form-input" value="${w.name||''}" placeholder="e.g. Pune Distribution Centre" />
      </div>
      <div class="form-group">
        <label class="form-label">City *</label>
        <input id="w-city" class="form-input" value="${w.city||''}" placeholder="e.g. Pune" />
      </div>
      <div class="form-group">
        <label class="form-label">Region</label>
        <input id="w-region" class="form-input" value="${w.region||''}" placeholder="e.g. West India" />
      </div>
      <div class="form-group">
        <label class="form-label">Latitude</label>
        <input id="w-lat" class="form-input" type="number" step="0.001" value="${w.lat||20.5}" />
      </div>
      <div class="form-group">
        <label class="form-label">Longitude</label>
        <input id="w-lng" class="form-input" type="number" step="0.001" value="${w.lng||78.9}" />
      </div>
      <div class="form-group">
        <label class="form-label">Storage Capacity (units)</label>
        <input id="w-capacity_units" class="form-input" type="number" min="1" value="${w.capacity_units||10000}" />
      </div>
      <div class="form-group">
        <label class="form-label">Avg Transport Time (days)</label>
        <input id="w-transport_time_days" class="form-input" type="number" min="0" step="0.5" value="${w.transport_time_days||1.5}" />
      </div>
      <div class="form-group">
        <label class="form-label">Contact Person</label>
        <input id="w-contact_person" class="form-input" value="${w.contact_person||''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Contact Phone</label>
        <input id="w-contact_phone" class="form-input" value="${w.contact_phone||''}" placeholder="+91-…" />
      </div>
      <div class="form-group span2">
        <label class="form-check">
          <input type="checkbox" id="w-has_cold_storage" ${w.has_cold_storage ? 'checked' : ''} />
          Has Cold Storage / Refrigeration
        </label>
      </div>
    </div>`;
}

function readWarehouseForm() {
  return {
    name:                document.getElementById('w-name').value.trim(),
    city:                document.getElementById('w-city').value.trim(),
    region:              document.getElementById('w-region').value.trim(),
    lat:                 parseFloat(document.getElementById('w-lat').value) || 20.5,
    lng:                 parseFloat(document.getElementById('w-lng').value) || 78.9,
    capacity_units:      parseFloat(document.getElementById('w-capacity_units').value) || 10000,
    transport_time_days: parseFloat(document.getElementById('w-transport_time_days').value) || 1.5,
    contact_person:      document.getElementById('w-contact_person').value.trim(),
    contact_phone:       document.getElementById('w-contact_phone').value.trim(),
    has_cold_storage:    document.getElementById('w-has_cold_storage').checked ? 1 : 0,
  };
}

function openAddWarehouse() {
  Modal.open({
    title: 'Add Warehouse', body: warehouseForm(), large: true,
    footer: `<button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
             <button class="btn btn-primary" onclick="submitAddWarehouse()">Add Warehouse</button>`,
  });
}

async function submitAddWarehouse() {
  const body = readWarehouseForm();
  if (!body.name || !body.city) { toast('Name and city are required', 'error'); return; }
  try {
    await api('/api/warehouses', 'POST', body);
    Modal.close(); toast('Warehouse added', 'success'); navigate('warehouses');
  } catch(e) { toast(e.message, 'error'); }
}

async function openEditWarehouse(wid) {
  const w = await api(`/api/warehouses/${wid}`);
  Modal.open({
    title: 'Edit Warehouse', body: warehouseForm(w), large: true,
    footer: `<button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
             <button class="btn btn-primary" onclick="submitEditWarehouse(${wid})">Save Changes</button>`,
  });
}

async function submitEditWarehouse(wid) {
  const body = readWarehouseForm();
  try {
    await api(`/api/warehouses/${wid}`, 'PUT', body);
    Modal.close(); toast('Warehouse updated', 'success'); navigate('warehouses');
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteWarehouse(wid) {
  if (!confirm('Delete this warehouse? All inventory batches at this location will be removed.')) return;
  try {
    await api(`/api/warehouses/${wid}`, 'DELETE');
    toast('Warehouse deleted', 'info'); navigate('warehouses');
  } catch(e) { toast(e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════

async function init() {
  // Initial page from hash or default to dashboard
  const startPage = location.hash.slice(1) || 'dashboard';
  await updateRecBadge();
  navigate(startPage);
}

init();
