const API = '/api/coordinates';

const CATEGORIES = [
  { value: '拠点',               icon: '🏠' },
  { value: '農場',               icon: '🌾' },
  { value: '村',                 icon: '🏘️' },
  { value: 'ウッドランドマンション', icon: '🏚️' },
  { value: 'ピリジャー前哨基地',  icon: '🗼' },
  { value: '砂漠の神殿',         icon: '🏜️' },
  { value: 'ジャングルの神殿',    icon: '🌿' },
  { value: 'イグルー',           icon: '🧊' },
  { value: '海底神殿',           icon: '🌊' },
  { value: '沈没船',             icon: '⚓' },
  { value: '廃坑',               icon: '🕳️' },
  { value: '要塞',               icon: '🏯' },
  { value: 'ネザー要塞',         icon: '🔥' },
  { value: 'エンドシティ',       icon: '🌆' },
  { value: '資源',               icon: '💎' },
  { value: 'その他',             icon: '📌' },
];

const DIM_LABELS = {
  overworld: '🌍 オーバーワールド',
  nether: '🔥 ネザー',
  end: '🌌 エンド',
};

// ===== State =====
let deleteTargetId = null;
let searchTimeout = null;
let allCoords = [];
let selectedCategory = null; // null = すべて表示

// ===== DOM refs =====
const addForm = document.getElementById('add-form');
const formError = document.getElementById('form-error');
const coordsList = document.getElementById('coords-list');
const countBadge = document.getElementById('count-badge');
const searchInput = document.getElementById('search');
const filterDimension = document.getElementById('filter-dimension');
const clearFiltersBtn = document.getElementById('clear-filters');
const categoryPillsEl = document.getElementById('category-pills');
const modalOverlay = document.getElementById('modal-overlay');
const modalMessage = document.getElementById('modal-message');
const modalConfirm = document.getElementById('modal-confirm');
const modalCancel = document.getElementById('modal-cancel');
const copyToast = document.getElementById('copy-toast');

const addModalOverlay = document.getElementById('add-modal-overlay');
const addCancel = document.getElementById('add-cancel');
const fab = document.getElementById('fab');

const editModalOverlay = document.getElementById('edit-modal-overlay');
const editForm = document.getElementById('edit-form');
const editError = document.getElementById('edit-error');
const editCancel = document.getElementById('edit-cancel');
const editCategoryEl = document.getElementById('edit-category');

// カテゴリ選択肢を編集モーダルにも反映
editCategoryEl.innerHTML = CATEGORIES.map(c =>
  `<option value="${c.value}">${c.icon} ${c.value}</option>`
).join('');


function buildPills() {
  categoryPillsEl.innerHTML = CATEGORIES.map(c => `
    <span class="cat-pill" data-cat="${escHtml(c.value)}">
      ${c.icon} ${c.value}
    </span>`).join('');

  categoryPillsEl.querySelectorAll('.cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const cat = pill.dataset.cat;
      if (selectedCategory === cat) {
        // 同じピルを再クリック → 全表示に戻す
        selectedCategory = null;
        pill.classList.remove('active');
      } else {
        // 別のピルをクリック → そのカテゴリだけ表示
        selectedCategory = cat;
        categoryPillsEl.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      }
      applyFilters();
    });
  });
}

// ===== API =====
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

// ===== Filter & Render =====
function applyFilters() {
  const filtered = selectedCategory
    ? allCoords.filter(c => c.category === selectedCategory)
    : allCoords;
  renderCoords(filtered);
}

function renderCoords(coords) {
  countBadge.textContent = `${coords.length}件`;

  if (coords.length === 0) {
    coordsList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🗺️</span>
        該当する座標がありません。
      </div>`;
    return;
  }

  coordsList.innerHTML = coords.map(c => {
    const date = new Date(c.created_at).toLocaleString('ja-JP', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
    const dimLabel = DIM_LABELS[c.dimension] || c.dimension;
    const catDef = CATEGORIES.find(k => k.value === c.category);
    const catIcon = catDef ? catDef.icon : '📌';
    return `
      <div class="coord-card dim-${c.dimension}">
        <div class="dim-stripe"></div>
        <div class="coord-body">
          <div class="coord-top">
            <span class="coord-name">${escHtml(c.name)}</span>
            <span class="dim-tag ${c.dimension}">${dimLabel}</span>
            <span class="cat-tag">${catIcon} ${escHtml(c.category)}</span>
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
          <button class="btn-icon" onclick="openEdit(${c.id})" title="編集">✏️</button>
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

// ===== Load =====
async function loadCoords() {
  coordsList.innerHTML = '<div class="loading">読み込み中...</div>';
  allCoords = await fetchCoords();
  applyFilters();
}

// ===== Form =====
fab.addEventListener('click', () => {
  addForm.reset();
  formError.hidden = true;
  addModalOverlay.classList.add('open');
});
addCancel.addEventListener('click', () => addModalOverlay.classList.remove('open'));
addModalOverlay.addEventListener('click', (e) => {
  if (e.target === addModalOverlay) addModalOverlay.classList.remove('open');
});

addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.hidden = true;
  const data = {
    name: document.getElementById('name').value,
    x: document.getElementById('x').value,
    y: 64,
    z: document.getElementById('z').value,
    dimension: document.getElementById('dimension').value,
    category: document.getElementById('category').value,
    notes: document.getElementById('notes').value,
    author: 'anonymous',
  };
  try {
    await addCoord(data);
    addForm.reset();
    addModalOverlay.classList.remove('open');
    await loadCoords();
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
  }
});

// ===== Filter events =====
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(loadCoords, 300);
});
filterDimension.addEventListener('change', loadCoords);

clearFiltersBtn.addEventListener('click', () => {
  searchInput.value = '';
  filterDimension.value = '';
  selectedCategory = null;
  categoryPillsEl.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
  loadCoords();
});

// ===== Copy =====
function copyCoords(x, z) {
  navigator.clipboard.writeText(`${x} ${z}`).then(showToast);
}

let toastTimer = null;
function showToast() {
  copyToast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { copyToast.hidden = true; }, 2000);
}

// ===== Delete modal =====
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

// ===== Edit modal =====
let editTargetId = null;

function openEdit(id) {
  const coord = allCoords.find(c => c.id === id);
  if (!coord) return;
  editTargetId = id;
  document.getElementById('edit-name').value = coord.name;
  document.getElementById('edit-x').value = coord.x;
  document.getElementById('edit-z').value = coord.z;
  document.getElementById('edit-dimension').value = coord.dimension;
  document.getElementById('edit-category').value = coord.category;
  document.getElementById('edit-notes').value = coord.notes || '';
  editError.hidden = true;
  editModalOverlay.classList.add('open');
}

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  editError.hidden = true;
  const data = {
    name: document.getElementById('edit-name').value,
    x: document.getElementById('edit-x').value,
    z: document.getElementById('edit-z').value,
    dimension: document.getElementById('edit-dimension').value,
    category: document.getElementById('edit-category').value,
    notes: document.getElementById('edit-notes').value,
  };
  try {
    const res = await fetch(`${API}/${editTargetId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || '更新に失敗しました');
    editModalOverlay.classList.remove('open');
    editTargetId = null;
    await loadCoords();
  } catch (err) {
    editError.textContent = err.message;
    editError.hidden = false;
  }
});

editCancel.addEventListener('click', () => {
  editModalOverlay.classList.remove('open');
  editTargetId = null;
});

editModalOverlay.addEventListener('click', (e) => {
  if (e.target === editModalOverlay) {
    editModalOverlay.classList.remove('open');
    editTargetId = null;
  }
});

// ===== Init =====
buildPills();
loadCoords();


