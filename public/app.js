const API = '/api/coordinates';

const DIM_LABELS = {
  overworld: '🌍 オーバーワールド',
  nether: '🔥 ネザー',
  end: '🌌 エンド',
};

let deleteTargetId = null;
let searchTimeout = null;

const addForm = document.getElementById('add-form');
const formError = document.getElementById('form-error');
const coordsList = document.getElementById('coords-list');
const countBadge = document.getElementById('count-badge');
const searchInput = document.getElementById('search');
const filterDimension = document.getElementById('filter-dimension');
const clearFiltersBtn = document.getElementById('clear-filters');
const modalOverlay = document.getElementById('modal-overlay');
const modalMessage = document.getElementById('modal-message');
const modalConfirm = document.getElementById('modal-confirm');
const modalCancel = document.getElementById('modal-cancel');
const copyToast = document.getElementById('copy-toast');

async function fetchCoords() {
  const params = new URLSearchParams();
  const search = searchInput.value.trim();
  const dimension = filterDimension.value;
  if (search) params.set('search', search);
  if (dimension) params.set('dimension', dimension);
  const res = await fetch(`${API}?${params}`);
  return res.json();
}

async function addCoord(data) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || '追加に失敗しました');
  return json;
}

async function deleteCoord(id) {
  const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('削除に失敗しました');
}

function renderCoords(coords) {
  countBadge.textContent = `${coords.length}件`;

  if (coords.length === 0) {
    coordsList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🗺️</span>
        座標がまだ登録されていません。<br/>最初の場所を追加してみよう！
      </div>`;
    return;
  }

  coordsList.innerHTML = coords.map(c => {
    const date = new Date(c.created_at).toLocaleString('ja-JP', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
    const dimLabel = DIM_LABELS[c.dimension] || c.dimension;
    return `
      <div class="coord-card dim-${c.dimension}">
        <div class="dim-stripe"></div>
        <div class="coord-body">
          <div class="coord-top">
            <span class="coord-name">${escHtml(c.name)}</span>
            <span class="dim-tag ${c.dimension}">${dimLabel}</span>
          </div>
          <div class="coord-xyz" title="クリックでコピー" onclick="copyCoords(${c.x}, ${c.z})">
            <span><span class="axis">X</span><span class="cx">${c.x}</span></span>
            <span><span class="axis">Z</span><span class="cz">${c.z}</span></span>
            <span class="copy-hint">📋 コピー</span>
          </div>
          ${c.notes ? `<div class="coord-notes">${escHtml(c.notes)}</div>` : ''}
          <div class="coord-meta">🕐 ${date}</div>
        </div>
        <div class="coord-actions">
          <button class="btn-icon delete" onclick="confirmDelete(${c.id}, '${escAttr(c.name)}')" title="削除">🗑️</button>
        </div>
      </div>`;
  }).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(str) { return String(str).replace(/'/g, "\\'"); }

async function loadCoords() {
  coordsList.innerHTML = '<div class="loading">読み込み中...</div>';
  const coords = await fetchCoords();
  renderCoords(coords);
}

addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.hidden = true;

  const data = {
    name: document.getElementById('name').value,
    x: document.getElementById('x').value,
    y: 64,
    z: document.getElementById('z').value,
    dimension: document.getElementById('dimension').value,
    category: 'その他',
    notes: document.getElementById('notes').value,
    author: 'anonymous',
  };

  try {
    await addCoord(data);
    addForm.reset();
    await loadCoords();
    document.getElementById('list-section').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
  }
});

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(loadCoords, 300);
});

filterDimension.addEventListener('change', loadCoords);

clearFiltersBtn.addEventListener('click', () => {
  searchInput.value = '';
  filterDimension.value = '';
  loadCoords();
});

function copyCoords(x, z) {
  navigator.clipboard.writeText(`${x} ${z}`).then(showToast);
}

let toastTimer = null;
function showToast() {
  copyToast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { copyToast.hidden = true; }, 2000);
}

function confirmDelete(id, name) {
  deleteTargetId = id;
  modalMessage.textContent = `「${name}」を削除しますか？この操作は元に戻せません。`;
  modalOverlay.classList.add('open');
}

modalConfirm.addEventListener('click', async () => {
  if (!deleteTargetId) return;
  modalOverlay.classList.remove('open');
  await deleteCoord(deleteTargetId);
  deleteTargetId = null;
  await loadCoords();
});

modalCancel.addEventListener('click', () => {
  modalOverlay.classList.remove('open');
  deleteTargetId = null;
});

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    modalOverlay.classList.remove('open');
    deleteTargetId = null;
  }
});

loadCoords();

