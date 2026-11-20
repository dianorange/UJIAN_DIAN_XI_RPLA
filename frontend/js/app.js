const API = "http://localhost:5000/api";
let dataAlat = [];
let dataKategori = [];
let dataPeminjaman = [];
const $ = (id) => document.getElementById(id);

function esc(v) {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtTanggal(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d)) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function hariIni() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const t = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${t}`;
}

function toast(pesan, error = false) {
  const el = $("toast");
  el.textContent = pesan;
  el.className =
    "fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-lg shadow-lg text-white " +
    (error ? "bg-red-600" : "bg-green-600");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add("hidden"), 3000);
}

async function request(path, method = "GET", body) {
  const opt = { method, headers: { "Content-Type": "application/json" } };
  if (body) opt.body = JSON.stringify(body);
  const res = await fetch(API + path, opt);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Terjadi kesalahan");
  return data;
}

function bukaModal(id) {
  $(id).classList.remove("hidden");
  $(id).classList.add("flex");
}
function tutupModal(id) {
  $(id).classList.add("hidden");
  $(id).classList.remove("flex");
}

document.querySelectorAll("[data-close]").forEach((b) =>
  b.addEventListener("click", () => tutupModal(b.dataset.close))
);

const badgeStatus = {
  Dipinjam: "bg-yellow-100 text-yellow-800",
  Dikembalikan: "bg-green-100 text-green-800",
  Terlambat: "bg-red-100 text-red-800",
};

//Load data
async function muatSemua() {
  try {
    [dataAlat, dataKategori, dataPeminjaman] = await Promise.all([
      request("/alat"),
      request("/kategori"),
      request("/peminjaman"),
    ]);
    renderAlat();
    renderKategori();
    renderPeminjaman();
    isiDropdown();
  } catch (e) {
    toast("Gagal memuat data: " + e.message, true);
  }
}

function isiDropdown() {
  $("aKategori").innerHTML = dataKategori
    .map((k) => `<option value="${k.id_kategori}">${esc(k.nama_kategori)}</option>`)
    .join("");
  const tersedia = dataAlat.filter((a) => a.stok > 0);
  $("pAlat").innerHTML =
    `<option value="">-- Pilih alat --</option>` +
    tersedia
      .map((a) => `<option value="${a.id_alat}">${esc(a.nama_alat)} (stok: ${a.stok})</option>`)
      .join("");
}

function renderAlat() {
  const tbody = $("tabelAlat");
  if (!dataAlat.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-6 text-center text-slate-400">Belum ada data alat</td></tr>`;
    return;
  }
  tbody.innerHTML = dataAlat
    .map(
      (a) => `
    <tr class="hover:bg-slate-50">
      <td class="px-4 py-3">${a.id_alat}</td>
      <td class="px-4 py-3">${a.id_kategori ?? "-"} <span class="text-slate-400">(${esc(a.nama_kategori || "-")})</span></td>
      <td class="px-4 py-3 font-medium">${esc(a.nama_alat)}</td>
      <td class="px-4 py-3">${esc(a.kondisi)}</td>
      <td class="px-4 py-3">${a.stok}</td>
      <td class="px-4 py-3">${esc(a.lokasi || "-")}</td>
      <td class="px-4 py-3 whitespace-nowrap">
        <button onclick="editAlat(${a.id_alat})" class="px-3 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white text-xs">Edit</button>
        <button onclick="hapusAlat(${a.id_alat})" class="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs">Hapus</button>
      </td>
    </tr>`
    )
    .join("");
}

function renderKategori() {
  const tbody = $("tabelKategori");
  if (!dataKategori.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-6 text-center text-slate-400">Belum ada kategori</td></tr>`;
    return;
  }
  tbody.innerHTML = dataKategori
    .map(
      (k) => `
    <tr class="hover:bg-slate-50">
      <td class="px-4 py-3">${k.id_kategori}</td>
      <td class="px-4 py-3 font-medium">${esc(k.nama_kategori)} <span class="text-slate-400 text-xs">(${k.jumlah_alat} alat)</span></td>
      <td class="px-4 py-3">${esc(k.deskripsi || "-")}</td>
      <td class="px-4 py-3 whitespace-nowrap">
        <button onclick="editKategori(${k.id_kategori})" class="px-3 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white text-xs">Edit</button>
        <button onclick="hapusKategori(${k.id_kategori})" class="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs">Hapus</button>
      </td>
    </tr>`
    )
    .join("");
}

function renderPeminjaman() {
  const tbody = $("tabelPeminjaman");
  if (!dataPeminjaman.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="px-4 py-6 text-center text-slate-400">Belum ada riwayat peminjaman</td></tr>`;
    return;
  }
  tbody.innerHTML = dataPeminjaman
    .map((p) => {
      const kembaliBtn =
        p.status === "Dipinjam"
          ? `<button onclick="kembalikan(${p.id_peminjaman})" class="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-xs">Kembalikan</button>`
          : "";
      const hapusBtn =
        p.status !== "Dipinjam"
          ? `<button onclick="hapusPeminjaman(${p.id_peminjaman})" class="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs">Hapus</button>`
          : "";
      return `
    <tr class="hover:bg-slate-50">
      <td class="px-4 py-3">${p.id_peminjaman}</td>
      <td class="px-4 py-3">${p.id_alat} <span class="text-slate-400">(${esc(p.nama_alat || "-")})</span></td>
      <td class="px-4 py-3 font-medium">${esc(p.nama_peminjam)}</td>
      <td class="px-4 py-3">${esc(p.kelas)}</td>
      <td class="px-4 py-3">${fmtTanggal(p.tanggal_pinjam)}</td>
      <td class="px-4 py-3">${fmtTanggal(p.tanggal_kembali)}</td>
      <td class="px-4 py-3">${p.jumlah}</td>
      <td class="px-4 py-3"><span class="px-2 py-1 rounded-full text-xs font-medium ${badgeStatus[p.status] || ""}">${esc(p.status)}</span></td>
      <td class="px-4 py-3 whitespace-nowrap">${kembaliBtn} ${hapusBtn}</td>
    </tr>`;
    })
    .join("");
}

$("btnTambahAlat").addEventListener("click", () => {
  if (!dataKategori.length) {
    toast("Tambah kategori terlebih dahulu", true);
    return;
  }
  $("formAlat").reset();
  $("aId").value = "";
  $("aKondisi").value = "Baik";
  $("judulModalAlat").textContent = "Tambah Alat";
  bukaModal("modalAlat");
});

window.editAlat = (id) => {
  const a = dataAlat.find((x) => x.id_alat === id);
  if (!a) return;
  $("aId").value = a.id_alat;
  $("aKategori").value = a.id_kategori;
  $("aNama").value = a.nama_alat;
  $("aKondisi").value = a.kondisi || "";
  $("aStok").value = a.stok;
  $("aLokasi").value = a.lokasi || "";
  $("judulModalAlat").textContent = "Edit Alat";
  bukaModal("modalAlat");
};

$("formAlat").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("aId").value;
  const body = {
    id_kategori: Number($("aKategori").value),
    nama_alat: $("aNama").value.trim(),
    kondisi: $("aKondisi").value.trim() || "Baik",
    stok: Number($("aStok").value),
    lokasi: $("aLokasi").value.trim(),
  };
  try {
    if (id) await request(`/alat/${id}`, "PATCH", body);
    else await request("/alat", "POST", body);
    tutupModal("modalAlat");
    toast(id ? "Alat berhasil diperbarui" : "Alat berhasil ditambahkan");
    muatSemua();
  } catch (err) {
    toast(err.message, true);
  }
});

window.hapusAlat = async (id) => {
  if (!confirm("Hapus alat ini?")) return;
  try {
    await request(`/alat/${id}`, "DELETE");
    toast("Alat berhasil dihapus");
    muatSemua();
  } catch (err) {
    toast(err.message, true);
  }
};

$("btnTambahKategori").addEventListener("click", () => {
  $("formKategori").reset();
  $("kId").value = "";
  $("judulModalKategori").textContent = "Tambah Kategori";
  bukaModal("modalKategori");
});

window.editKategori = (id) => {
  const k = dataKategori.find((x) => x.id_kategori === id);
  if (!k) return;
  $("kId").value = k.id_kategori;
  $("kNama").value = k.nama_kategori;
  $("kDeskripsi").value = k.deskripsi || "";
  $("judulModalKategori").textContent = "Edit Kategori";
  bukaModal("modalKategori");
};

$("formKategori").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("kId").value;
  const body = {
    nama_kategori: $("kNama").value.trim(),
    deskripsi: $("kDeskripsi").value.trim(),
  };
  try {
    if (id) await request(`/kategori/${id}`, "PATCH", body);
    else await request("/kategori", "POST", body);
    tutupModal("modalKategori");
    toast(id ? "Kategori berhasil diperbarui" : "Kategori berhasil ditambahkan");
    muatSemua();
  } catch (err) {
    toast(err.message, true);
  }
});

window.hapusKategori = async (id) => {
  if (!confirm("Hapus kategori ini? Semua alat di dalamnya juga akan ikut terhapus.")) return;
  try {
    await request(`/kategori/${id}`, "DELETE");
    toast("Kategori berhasil dihapus");
    muatSemua();
  } catch (err) {
    toast(err.message, true);
  }
};

$("formPeminjaman").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!$("pAlat").value) {
    toast("Pilih alat terlebih dahulu", true);
    return;
  }
  const body = {
    id_alat: Number($("pAlat").value),
    nama_peminjam: $("pNama").value.trim(),
    kelas: $("pKelas").value.trim(),
    jumlah: Number($("pJumlah").value),
  };
  try {
    await request("/peminjaman", "POST", body);
    $("formPeminjaman").reset();
    toast("Peminjaman berhasil dicatat");
    muatSemua();
  } catch (err) {
    toast(err.message, true);
  }
});

window.kembalikan = async (id) => {
  if (!confirm("Tandai peminjaman ini sebagai dikembalikan?")) return;
  try {
    await request(`/peminjaman/${id}`, "PATCH", {
      status: "Dikembalikan",
      tanggal_kembali: hariIni(),
    });
    toast("Alat berhasil dikembalikan");
    muatSemua();
  } catch (err) {
    toast(err.message, true);
  }
};

window.hapusPeminjaman = async (id) => {
  if (!confirm("Hapus riwayat peminjaman ini?")) return;
  try {
    await request(`/peminjaman/${id}`, "DELETE");
    toast("Riwayat peminjaman dihapus");
    muatSemua();
  } catch (err) {
    toast(err.message, true);
  }
};

$("pAlat").addEventListener("change", () => {
  const alat = dataAlat.find((a) => a.id_alat === Number($("pAlat").value));
  $("pJumlah").max = alat ? alat.stok : "";
});

muatSemua();