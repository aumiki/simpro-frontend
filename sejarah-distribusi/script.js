/* ══════════════════════════════════════════════════════════════
   SIMPRO – sejarah-distribusi/script.js  (API version)
   ══════════════════════════════════════════════════════════════ */

var perPage     = 15;
var currentPage = 1;
var _cachedData = [];

async function loadData() {
  _cachedData = await simpro_ambilSemuaDistribusi();
}

function totalPages() {
  return Math.ceil(_cachedData.length / perPage);
}

// ══ Render tabel ══
async function renderTable() {
  await loadData();
  var tbody = document.getElementById('distribusiTableBody');
  tbody.innerHTML = '';

  if (_cachedData.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;padding:32px;color:#aaa;font-style:italic;">' +
      'Belum ada data distribusi. Tambahkan distribusi baru.</td></tr>';
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  var start    = (currentPage - 1) * perPage;
  var end      = Math.min(start + perPage, _cachedData.length);
  var pageData = _cachedData.slice(start, end);

  pageData.forEach(function(row) {
    var rowId = row.id; // gunakan ID dari database
    var tglDistrib = row.tgl_distribusi || row.tglDistribusi || '-';
    var tglProd    = row.tgl_produksi   || row.tglProduksi   || '-';

    // Format tanggal untuk tampilan (DD/MM/YY)
    if (tglDistrib && tglDistrib.indexOf('-') !== -1) tglDistrib = simpro_isoToDMY(tglDistrib);
    if (tglProd    && tglProd.indexOf('-')    !== -1) tglProd    = simpro_isoToDMY(tglProd);

    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + tglDistrib + '</td>' +
      '<td>' + (row.pelanggan || '-') + '</td>' +
      '<td>' + tglProd + '</td>' +
      '<td>' + (row.jumlah || 0) + '</td>' +
      '<td>' +
        "<button class='edit-btn' onclick='openModal(" + rowId + ")' title='Edit'>" +
          "<svg width='15' height='15' fill='none' stroke='currentColor' stroke-width='1.8' viewBox='0 0 24 24'>" +
            "<path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/>" +
            "<path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/>" +
          '</svg>' +
        '</button> ' +
        "<button class='edit-btn' onclick='konfirmasiHapus(" + rowId + ")' title='Hapus' style='color:#c0392b;margin-left:4px;'>" +
          "<svg width='15' height='15' fill='none' stroke='currentColor' stroke-width='1.8' viewBox='0 0 24 24'>" +
            "<polyline points='3 6 5 6 21 6'/>" +
            "<path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'/>" +
            "<path d='M10 11v6M14 11v6'/>" +
          '</svg>' +
        '</button>' +
      '</td>' +
      '<td>' +
        "<select class='status-select " + _statusClass(row.status) + "' onchange='updateStatus(" + rowId + ", this.value)'>" +
          optionsHtml(row.status) +
        '</select>' +
      '</td>';
    tbody.appendChild(tr);
  });

  renderPagination();
}

function _statusClass(status) {
  switch (status) {
    case 'Sudah Terkirim': return 'status-terkirim';
    case 'Sedang Dikirim': return 'status-dikirim';
    default:               return 'status-belum';
  }
}

function optionsHtml(selected) {
  return ['Belum Dikirim', 'Sedang Dikirim', 'Sudah Terkirim'].map(function(o) {
    return "<option value='" + o + "'" + (o === selected ? ' selected' : '') + '>' + o + '</option>';
  }).join('');
}

async function updateStatus(id, val) {
  await simpro_updateDistribusi(id, { status: val });
  await renderTable();
  showToast('Status diperbarui: ' + val);
}

async function konfirmasiHapus(id) {
  if (!confirm('Hapus data distribusi ini? Stok akan dikembalikan.')) return;
  await simpro_hapusDistribusi(id);
  if (currentPage > totalPages()) currentPage = Math.max(1, totalPages());
  await renderTable();
  showToast('Data dihapus dan stok dikembalikan.');
}

// ══ Pagination ══
function renderPagination() {
  var pg    = document.getElementById('pagination');
  pg.innerHTML = '';
  var total = totalPages();
  if (total <= 1) return;

  var prev = document.createElement('button');
  prev.className = 'page-btn'; prev.textContent = '‹'; prev.disabled = currentPage === 1;
  prev.onclick = async function() { if (currentPage > 1) { currentPage--; await renderTable(); } };
  pg.appendChild(prev);

  [1,2,3].forEach(function(p) {
    if (p > total) return;
    var btn = document.createElement('button');
    btn.className = 'page-btn' + (p === currentPage ? ' active' : '');
    btn.textContent = p;
    btn.onclick = (function(page) { return async function() { currentPage = page; await renderTable(); }; })(p);
    pg.appendChild(btn);
  });

  if (total > 4) {
    var dots = document.createElement('span'); dots.className = 'page-dots'; dots.textContent = '...';
    pg.appendChild(dots);
  }
  if (total > 3) {
    var lastBtn = document.createElement('button');
    lastBtn.className = 'page-btn' + (total === currentPage ? ' active' : '');
    lastBtn.textContent = total;
    lastBtn.onclick = async function() { currentPage = total; await renderTable(); };
    pg.appendChild(lastBtn);
  }

  var next = document.createElement('button');
  next.className = 'page-btn'; next.textContent = '›'; next.disabled = currentPage === total;
  next.onclick = async function() { if (currentPage < total) { currentPage++; await renderTable(); } };
  pg.appendChild(next);
}

// ══ Modal Edit → redirect ke halaman edit ══
function openModal(id) {
  window.location.href = '../distribusi/edit/edit.html?id=' + id;
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
}

// ══ Modal Buat Baru ══
function openModalBuat() {
  var today = new Date().toISOString().split('T')[0];
  document.getElementById('buatTanggal').value     = today;
  document.getElementById('buatTanggalProd').value = today;
  document.getElementById('buatPelanggan').value   = '';
  document.getElementById('buatJumlah').value      = '';
  document.getElementById('buatStatus').value      = 'Belum Dikirim';
  document.getElementById('modalBuat').classList.add('show');
}

function closeBuat() { document.getElementById('modalBuat').classList.remove('show'); }

function simpanBuat() {
  closeBuat();
  window.location.href = '../distribusi/tambah/tambah.html';
}

// ══ Toast ══
function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 3000);
}

function logout() { simpro_logout(); }

// ══ Init ══
window.onload = async function() {
  simpro_requireLogin();
  await renderTable();
  ['modalOverlay', 'modalBuat'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', function(e) {
      if (e.target === this) { this.classList.remove('show'); }
    });
  });
  setupMobileNav();
};

function setupMobileNav() {
  const hamburger = document.getElementById('hamburger');
  if (!hamburger) return;
  let drawer = document.getElementById('navDrawer');
  if (!drawer) {
    drawer = document.createElement('div');
    drawer.id = 'navDrawer'; drawer.className = 'nav-drawer';
    drawer.innerHTML = `
      <a href="../dashboard/index.html">Beranda</a>
      <a href="../produksi/index.html">Produksi</a>
      <a href="#" class="nav-active">Distribusi</a>
      <a href="../keuntungan/index.html">Laporan Keuntungan</a>
      <div class="drawer-bottom">
        <button class="btn-icon">
          <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
            <circle cx="19" cy="19" r="18" stroke="#A64B4B" stroke-width="1.5" fill="#f2e8e8"/>
            <circle cx="19" cy="15" r="5" stroke="#A64B4B" stroke-width="1.5" fill="none"/>
            <path d="M8 32c0-6 5-10 11-10s11 4 11 10" stroke="#A64B4B" stroke-width="1.5" stroke-linecap="round" fill="none"/>
          </svg>
        </button>
        <button class="btn-keluar" onclick="simpro_logout()">Keluar</button>
      </div>
    `;
    document.getElementById('navbar').insertAdjacentElement('afterend', drawer);
  }
  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('open');
    drawer.classList.toggle('open', isOpen);
  });
}
document.addEventListener('DOMContentLoaded', setupMobileNav);
