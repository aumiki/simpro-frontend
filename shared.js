'use strict';

/* ══════════════════════════════════════════════════════════════
   SIMPRO – shared.js  (v3 — API version)
   Semua fungsi data layer kini memanggil backend via fetch().
   localStorage hanya dipakai untuk: simpro_token, simpro_remember_user
   ══════════════════════════════════════════════════════════════ */

// ── CONFIG API ───────────────────────────────────────────────────
var API = 'https://isaiah-aphacic-tropologically.ngrok-free.dev/api';

function simpro_getToken() {
  return localStorage.getItem('simpro_token');
}

function _authHeader() {
  return { 
    'Authorization': 'Bearer ' + simpro_getToken(), 
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
  };
}

// ── MASTER DATA PRODUK (tetap di frontend untuk hitung lokal) ────
var SIMPRO_PRODUK = {
  tahu_bulat_cimol: {
    label: 'Tahu Bulat Cimol',   harga: 7000,  shelf: 3,
    bahan: [{ nama: 'Kacang Kedelai', satuan: 'kg', kebutuhan: 50, harga: 4200 }]
  },
  tahu_bulat_standar: {
    label: 'Tahu Bulat Standar', harga: 15000, shelf: 2,
    bahan: [{ nama: 'Kacang Kedelai', satuan: 'kg', kebutuhan: 50, harga: 15000 }]
  },
  tahu_bulat_jumbo: {
    label: 'Tahu Bulat Jumbo',   harga: 10200, shelf: 4,
    bahan: [{ nama: 'Kacang Kedelai', satuan: 'kg', kebutuhan: 50, harga: 17000 }]
  },
  sotong: {
    label: 'Sotong',             harga: 1700,  shelf: 3,
    bahan: [{ nama: 'Terigu + Tapioka', satuan: 'kg', kebutuhan: 10, harga: 1700 }]
  }
};

// ── DATE HELPERS ─────────────────────────────────────────────────
function simpro_pad(n) { return n < 10 ? '0' + n : '' + n; }

function simpro_toDMY(date) {
  return simpro_pad(date.getDate()) + '/' +
         simpro_pad(date.getMonth() + 1) + '/' +
         String(date.getFullYear()).slice(2);
}

function simpro_isoToDMY(isoStr) {
  if (!isoStr) return '';
  var p = isoStr.split('-');
  if (p.length !== 3) return '';
  return p[2] + '/' + p[1] + '/' + p[0].slice(2);
}

function simpro_dmyToISO(dmy) {
  if (!dmy) return '';
  var p = dmy.split('/');
  if (p.length !== 3) return '';
  return '20' + p[2] + '-' + p[1] + '-' + p[0];
}

function simpro_formatRupiah(val) {
  return 'Rp ' + Math.round(val).toLocaleString('id-ID');
}

// ── AUTH HELPERS ─────────────────────────────────────────────────
function simpro_isLoggedIn() {
  return !!localStorage.getItem('simpro_token');
}

function simpro_requireLogin() {
  if (!simpro_isLoggedIn()) {
    window.location.href = simpro_loginPath();
  }
}

function simpro_logout() {
  localStorage.removeItem('simpro_token');
  window.location.href = simpro_loginPath();
}

function simpro_loginPath() {
  var path = window.location.pathname.replace(/\\/g, '/');
  if (path.indexOf('/distribusi/tambah') !== -1 || path.indexOf('/distribusi/edit') !== -1) {
    return '../../login/index.html';
  }
  return '../login/index.html';
}

// ── STOK PRODUKSI ────────────────────────────────────────────────

async function simpro_ambilSemuaStok() {
  try {
    var res = await fetch(API + '/stok', { headers: _authHeader() });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) { return []; }
}

async function simpro_simpanHasilProduksi(produkKey, jumlah, biaya) {
  var produk = SIMPRO_PRODUK[produkKey];
  var tanggal = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  try {
    var res = await fetch(API + '/stok', {
      method: 'POST',
      headers: _authHeader(),
      body: JSON.stringify({
        tanggal,
        produk_key: produkKey,
        produk_nama: produk ? produk.label : produkKey,
        jumlah: parseInt(jumlah, 10)
      })
    });
    if (!res.ok) return { error: 'Gagal menyimpan stok' };
    return await res.json();
  } catch (e) { return { error: e.message }; }
}

async function simpro_editStok(id, jumlahBaru) {
  try {
    var res = await fetch(API + '/stok/' + id, {
      method: 'PUT',
      headers: _authHeader(),
      body: JSON.stringify({ jumlah: parseInt(jumlahBaru, 10) })
    });
    if (!res.ok) return { error: 'Gagal edit stok' };
    return await res.json();
  } catch (e) { return { error: e.message }; }
}

// Hitung total stok dari data yang sudah diambil (helper lokal)
function simpro_totalStokDariData(stokList, produkKey) {
  return stokList
    .filter(function(s) { return s.produk_key === produkKey && s.jumlah > 0; })
    .reduce(function(sum, s) { return sum + s.jumlah; }, 0);
}

async function simpro_totalStokProduk(produkKey) {
  var list = await simpro_ambilSemuaStok();
  return simpro_totalStokDariData(list, produkKey);
}

// Tanggal stok tersedia untuk dropdown (dari API)
async function simpro_tanggalStokTersedia(produkKey) {
  var list = await simpro_ambilSemuaStok();
  return list
    .filter(function(s) { return s.produk_key === produkKey && s.jumlah > 0; })
    .map(function(s) {
      var tglBersih = s.tanggal ? s.tanggal.split('T')[0] : '';
      return {
        id         : s.id,
        tanggalISO : tglBersih,
        tanggalDMY : simpro_isoToDMY(tglBersih),
        jumlah     : s.jumlah
      };
    });
}

// ── DISTRIBUSI ───────────────────────────────────────────────────

async function simpro_ambilSemuaDistribusi() {
  try {
    var res = await fetch(API + '/distribusi', { headers: _authHeader() });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) { return []; }
}

async function simpro_tambahDistribusi(data) {
  var produkKey = data.produk;
  var produk    = SIMPRO_PRODUK[produkKey];
  var jumlah    = parseInt(data.jumlah, 10);

  // Hitung kadaluarsa di frontend (agar konsisten dengan tampilan)
  var shelf      = produk ? produk.shelf : 3;
  var tglProdISO = data.tglProduksi.indexOf('-') !== -1
    ? data.tglProduksi
    : simpro_dmyToISO(data.tglProduksi);
  var tglProd = new Date(tglProdISO + 'T00:00:00');
  var tglKad  = new Date(tglProd);
  tglKad.setDate(tglProd.getDate() + shelf);

  var harga = produk ? produk.harga : 0;
  var total = harga * jumlah;

  var tglDistrib = data.tglDistribusi || new Date().toISOString().split('T')[0];
  // Pastikan tglDistrib dalam format ISO
  if (tglDistrib.indexOf('/') !== -1) tglDistrib = simpro_dmyToISO(tglDistrib);

  try {
    var res = await fetch(API + '/distribusi', {
      method: 'POST',
      headers: _authHeader(),
      body: JSON.stringify({
        tgl_distribusi : tglDistrib,
        pelanggan      : data.pelanggan      || '',
        telp_pelanggan : data.telp_pelanggan || '',
        no_kendaraan   : data.no_kendaraan   || '',
        telp_kondektur : data.telp_kondektur || '',
        lokasi         : data.lokasi         || '',
        produk_key     : produkKey,
        tgl_produksi   : tglProdISO,
        jumlah         : jumlah,
        total          : total,
        kadaluarsa     : tglKad.toISOString().split('T')[0]
      })
    });
    var json = await res.json();
    if (!res.ok) return { error: json.error || 'Gagal menyimpan distribusi' };
    return { entry: json };
  } catch (e) { return { error: e.message }; }
}

async function simpro_updateDistribusi(id, perubahan) {
  try {
    // Jika update status saja
    if (Object.keys(perubahan).length === 1 && perubahan.status !== undefined) {
      var res = await fetch(API + '/distribusi/' + id + '/status', {
        method: 'PUT',
        headers: _authHeader(),
        body: JSON.stringify({ status: perubahan.status })
      });
      var json = await res.json();
      if (!res.ok) return { error: json.error || 'Gagal update status' };
      return { success: true };
    }

    // Update data lengkap
    // Konversi tglProduksi ke ISO jika dalam format DMY
    if (perubahan.tglProduksi && perubahan.tglProduksi.indexOf('/') !== -1) {
      perubahan.tgl_produksi = simpro_dmyToISO(perubahan.tglProduksi);
    } else if (perubahan.tglProduksi) {
      perubahan.tgl_produksi = perubahan.tglProduksi;
    }

    // Mapping field nama frontend → backend
    var body = {
      tgl_distribusi : perubahan.tglDistribusi || undefined,
      pelanggan      : perubahan.pelanggan,
      telp_pelanggan : perubahan.telp_pelanggan,
      no_kendaraan   : perubahan.no_kendaraan,
      telp_kondektur : perubahan.telp_kondektur,
      lokasi         : perubahan.lokasi,
      jumlah         : perubahan.jumlah,
      total          : perubahan.total
    };
    // Hapus key undefined
    Object.keys(body).forEach(function(k) { if (body[k] === undefined) delete body[k]; });

    var res2 = await fetch(API + '/distribusi/' + id, {
      method: 'PUT',
      headers: _authHeader(),
      body: JSON.stringify(body)
    });
    var json2 = await res2.json();
    if (!res2.ok) return { error: json2.error || 'Gagal update distribusi' };
    return { success: true };
  } catch (e) { return { error: e.message }; }
}

async function simpro_hapusDistribusi(id) {
  try {
    var res = await fetch(API + '/distribusi/' + id, {
      method: 'DELETE',
      headers: _authHeader()
    });
    return res.ok;
  } catch (e) { return false; }
}

// ── KEUNTUNGAN ────────────────────────────────────────────────────
async function simpro_rekapKeuntungan() {
  try {
    var res = await fetch(API + '/keuntungan', { headers: _authHeader() });
    if (!res.ok) return [];
    var raw = await res.json();

    // Transform data dari backend ke format yang dipakai keuntungan/script.js
    return raw.map(function(r) {
      var parts  = r.bulan.split('-'); // "2024-05"
      var tahun  = parseInt(parts[0]);
      var bulan  = parseInt(parts[1]) - 1; // 0-based
      var namaBulan = ['Jan','Feb','Mar','Apr','Mei','Jun',
                       'Jul','Agu','Sep','Okt','Nov','Des'][bulan];
      return {
        key             : r.bulan,
        label           : namaBulan + ' ' + tahun,
        bulan           : bulan,
        tahun           : tahun,
        tahuBulat       : 0,   // backend tidak pisah per produk di endpoint keuntungan
        sotong          : 0,
        totalTerjual    : parseInt(r.jumlah_transaksi) || 0,
        totalKeuntungan : parseInt(r.total_keuntungan) || 0,
        days            : new Date(tahun, bulan + 1, 0).getDate()
      };
    });
  } catch (e) { return []; }
}