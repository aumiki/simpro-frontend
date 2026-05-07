// ── DATA BAHAN BAKU ──────────────────────────────────────────────
var produkData = {
  tahu_bulat_cimol: {
    nama: 'Kacang Kedelai', satuan: 'kg', harga: 4200,
    kebutuhanKg: 50, totalButir: 18000, butirPerBungkus: 100
  },
  tahu_bulat_standar: {
    nama: 'Kacang Kedelai', satuan: 'kg', harga: 15000,
    kebutuhanKg: 50, totalButir: 8000, butirPerBungkus: 100
  },
  tahu_bulat_jumbo: {
    nama: 'Kacang Kedelai', satuan: 'kg', harga: 17000,
    kebutuhanKg: 50, totalButir: 7500, butirPerBungkus: 60
  },
  sotong: {
    nama: 'Terigu + Tapioka', satuan: 'kg', harga: 1700,
    kebutuhanKg: 10, totalButir: 1300, butirPerBungkus: 10
  }
};

// ══ Render tabel bahan ══
function renderTable() {
  var key   = document.getElementById('produkSelect').value;
  var tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';
  document.getElementById('outEstimasi').textContent = '';
  document.getElementById('outBiaya').textContent    = '';

  if (!key || !produkData[key]) {
    var tr = document.createElement('tr');
    var td = document.createElement('td');
    td.colSpan = 5; td.style.textAlign = 'center';
    td.style.padding = '24px'; td.style.color = '#999'; td.style.fontStyle = 'italic';
    td.textContent = 'Silakan pilih produk terlebih dahulu.';
    tr.appendChild(td); tbody.appendChild(tr);
    return;
  }

  var b = produkData[key];
  var tr = document.createElement('tr');
  var input = document.createElement('input');
  input.type = 'number'; input.min = '0'; input.step = 'any';
  input.placeholder = 'Input Jumlah (kg)'; input.className = 'stok-input';

  tr.innerHTML =
    '<td>' + b.nama + '</td>' +
    '<td>' + b.satuan + '</td>' +
    '<td>' + b.kebutuhanKg + '</td>' +
'<td>Rp ' + b.harga.toLocaleString('id-ID') + '</td>';
  var tdStok = document.createElement('td');
  tdStok.appendChild(input);
  tr.appendChild(tdStok);
  tbody.appendChild(tr);
}

// ══ Hitung estimasi & biaya ══
function hitung() {
  var key = document.getElementById('produkSelect').value;
  if (!key || !produkData[key]) { showToast('Pilih produk terlebih dahulu!'); return; }

  var b      = produkData[key];
  var inputs = document.querySelectorAll('.stok-input');
  if (inputs.length === 0) { showToast('Tabel bahan belum tersedia!'); return; }

  var stokKg = parseFloat(inputs[0].value.trim());
  if (isNaN(stokKg) || stokKg <= 0) { showToast('Isi jumlah bahan terlebih dahulu!'); return; }

  // Hitung berapa kali bisa produksi (paket)
  var jumlahPaket  = Math.floor(stokKg / b.kebutuhanKg);
  var totalButir   = jumlahPaket * b.totalButir;
  var totalBungkus = Math.floor(totalButir / b.butirPerBungkus);
  var totalBiaya   = stokKg * b.harga;

  document.getElementById('outEstimasi').textContent = totalBungkus + ' bungkus';
  document.getElementById('outBiaya').textContent = 'Rp ' + Math.round(totalBiaya).toLocaleString('id-ID');
}

function reset() {
  document.querySelectorAll('.stok-input').forEach(function(i) { i.value = ''; });
  document.getElementById('outEstimasi').textContent = '';
  document.getElementById('outBiaya').textContent    = '';
}

// ══ Simpan hasil → POST ke backend ══
async function simpan() {
  var key = document.getElementById('produkSelect').value;
  var est = document.getElementById('outEstimasi').textContent.trim();

  if (est === '') { showToast('Hitung terlebih dahulu sebelum menyimpan!'); return; }

  // Ambil jumlah bungkus saja (angka pertama sebelum spasi)
  var jumlah = parseInt(est.split(' ')[0], 10);
  var biaya  = document.getElementById('outBiaya').textContent.trim();

  var btn = document.getElementById('btnSimpan');
  if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }

  try {
    var hasil = await simpro_simpanHasilProduksi(key, jumlah, biaya);
    if (hasil && hasil.error) {
      showToast('Gagal: ' + hasil.error);
    } else {
      showToast('Hasil perhitungan disimpan! ' + jumlah + ' bungkus masuk ke stok.');
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Simpan'; }
  }
}

// ══ Toast ══
function showToast(pesan) {
  var toast = document.getElementById('toast');
  toast.textContent = pesan;
  toast.classList.add('show');
  setTimeout(function() { toast.classList.remove('show'); }, 3000);
}

// ══ Init ══
window.onload = function() {
  simpro_requireLogin();
  renderTable();
  setupMobileNav();
};

function setupMobileNav() {
  const hamburger = document.getElementById('hamburger');
  if (!hamburger) return;
  let drawer = document.getElementById('navDrawer');
  if (!drawer) {
    drawer = document.createElement('div');
    drawer.id = 'navDrawer';
    drawer.className = 'nav-drawer';
    drawer.innerHTML = `
      <a href="../dashboard/index.html">Beranda</a>
      <a href="#" class="nav-active">Produksi</a>
      <a href="../stok-produksi/index.html">Distribusi</a>
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
  if (!hamburger.dataset.listenerSet) {
    hamburger.dataset.listenerSet = 'true';
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      drawer.classList.toggle('open', isOpen);
    });
  }
}
document.addEventListener('DOMContentLoaded', setupMobileNav);
