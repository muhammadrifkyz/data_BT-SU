import {
  emptyRow,
  EDITABLE_FIELDS,
  normalizeHak,
  normalizeSu,
  VILLAGES,
  type InventoryRow,
  type VillageId,
} from "../domain";

export const STORAGE_KEY = "bt-su:demo:v1";
const VERSION = 1;

export interface PageResult {
  rows: InventoryRow[];
  total: number;
}

// Integrasi berikutnya dapat mengganti kontrak ini tanpa mengubah tampilan.
// Operasi memakai ID internal, bukan NO. HAK atau nomor baris spreadsheet.
export interface InventoryService {
  list(
    villageId: VillageId,
    query: string,
    page: number,
    pageSize: number,
  ): Promise<PageResult>;
  findByHak(villageId: VillageId, hak: string): Promise<InventoryRow[]>;
  save(row: InventoryRow): Promise<InventoryRow>;
  delete(id: string, revision: number): Promise<void>;
}

interface StoredData {
  version: number;
  rows: InventoryRow[];
}
type StoragePort = Pick<Storage, "getItem" | "setItem">;

export function createDemoRows(): InventoryRow[] {
  return VILLAGES.flatMap((village, villageIndex) => {
    const rows: InventoryRow[] = [];
    for (let index = 0; index < 37; index++) {
      if (index === 2) continue; // 1026 sengaja kosong untuk alur tambah eksplisit.
      const partial = index === 1 || index % 7 === 0;
      rows.push({
        ...emptyRow(village.id, String(1024 + index)),
        id: `demo-${village.id}-${index}`,
        revision: 1,
        no: rows.length + 1,
        su:
          index === 0
            ? "SU 040"
            : index === 1
              ? "SU 40"
              : partial
                ? ""
                : `SU ${String(index + 40).padStart(3, "0")}`,
        tahunSu: partial && index > 0 ? "" : "2020",
        nib:
          partial && index > 0
            ? ""
            : `00123.0${villageIndex + 1}.${String(index + 1).padStart(5, "0")}`,
        luas: partial && index > 0 ? null : 1250 + index * 25,
        lembar: index === 0 ? "08-2" : partial ? "" : "A-3/4",
        kotak: index === 0 ? "E-5" : partial ? "" : "A-2",
        pemilikPertama: `Pemilik Fiktif ${String(index + 1).padStart(2, "0")}`,
        pemilikAkhir: partial
          ? ""
          : `Pemilik Demo ${String(index + 1).padStart(2, "0")}`,
        keterangan:
          index === 0 ? "Jual beli; Contoh data fiktif untuk latihan" : "",
        kupt: index % 3 === 0 ? "KUPT-DEMO-07" : "",
        cek: index % 3 === 0 ? "Sudah dicek (demo)" : "",
        kapling: index % 3 === 0 ? "K-08" : "",
        statusFisik: index % 3 === 0 ? "Tersedia (demo)" : "",
        kw: index % 3 === 0 ? "KW 1 (demo)" : "",
      });
    }
    rows.push({
      ...emptyRow(village.id, "1027"),
      id: `demo-${village.id}-duplicate`,
      revision: 1,
      no: 37,
      pemilikPertama: "Pemilik Fiktif Duplikat",
      su: "SU 099",
    });
    return rows;
  });
}

export class MockInventoryService implements InventoryService {
  constructor(
    private storage: StoragePort,
    private latency = 160,
  ) {}

  private async wait() {
    if (this.latency)
      await new Promise((resolve) => setTimeout(resolve, this.latency));
  }

  private read(): StoredData {
    let raw: string | null;
    try {
      raw = this.storage.getItem(STORAGE_KEY);
    } catch {
      throw new Error(
        "Penyimpanan browser tidak dapat dibaca. Izinkan penyimpanan lokal lalu coba lagi.",
      );
    }
    if (raw === null) {
      const initial = { version: VERSION, rows: createDemoRows() };
      this.write(initial);
      return initial;
    }
    try {
      const data = JSON.parse(raw) as StoredData;
      if (
        data.version !== VERSION ||
        !Array.isArray(data.rows) ||
        data.rows.some(
          (row) =>
            !row.id ||
            !VILLAGES.some((village) => village.id === row.villageId) ||
            !Number.isInteger(row.revision) ||
            typeof row.hak !== "string",
        )
      )
        throw new Error("Invalid demo data");
      return data;
    } catch {
      throw new Error(
        "Data demo di browser tidak valid. Data tidak ditimpa. Hapus hanya kunci bt-su:demo:v1 melalui DevTools untuk memulai ulang.",
      );
    }
  }

  private write(data: StoredData) {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      throw new Error(
        "Penyimpanan gagal. Ruang browser mungkin penuh atau akses penyimpanan diblokir. Isian Anda tetap tersedia; periksa penyimpanan lalu coba lagi.",
      );
    }
  }

  async list(
    villageId: VillageId,
    query: string,
    page: number,
    pageSize: number,
  ): Promise<PageResult> {
    await this.wait();
    const needle = query.trim().toLocaleLowerCase("id-ID");
    const filtered = this.read().rows.filter(
      (row) =>
        row.villageId === villageId &&
        (!needle ||
          [row.hak, row.su, row.nib, row.pemilikPertama, row.pemilikAkhir].some(
            (value) => value.toLocaleLowerCase("id-ID").includes(needle),
          )),
    );
    filtered.sort((a, b) => {
      const ah = BigInt(a.hak),
        bh = BigInt(b.hak);
      return ah < bh ? -1 : ah > bh ? 1 : a.no - b.no;
    });
    return {
      rows: filtered.slice((page - 1) * pageSize, page * pageSize),
      total: filtered.length,
    };
  }

  async findByHak(villageId: VillageId, hak: string): Promise<InventoryRow[]> {
    await this.wait();
    const normalized = normalizeHak(hak);
    return this.read().rows.filter(
      (row) =>
        row.villageId === villageId && normalizeHak(row.hak) === normalized,
    );
  }

  async save(input: InventoryRow): Promise<InventoryRow> {
    await this.wait();
    const data = this.read();
    const hak = normalizeHak(input.hak);
    if (input.tahunSu && !/^\d{4}$/.test(input.tahunSu))
      throw new Error("TAHUN SU harus terdiri dari 4 angka, atau dikosongkan.");
    if (input.luas !== null && (!Number.isFinite(input.luas) || input.luas < 0))
      throw new Error(
        "LUAS harus berupa angka nol atau lebih, atau dikosongkan.",
      );
    const previous = input.id
      ? data.rows.find((row) => row.id === input.id)
      : undefined;
    if (input.id && !previous)
      throw new Error(
        "Data ini telah dihapus. Cari ulang data sebelum menyimpan.",
      );
    if (previous && previous.revision !== input.revision)
      throw new Error(
        "Data berubah di tab lain. Isian Anda dipertahankan. Catat perubahan, lalu cari ulang data terbaru sebelum menyimpan.",
      );
    if (previous && previous.villageId !== input.villageId)
      throw new Error("Data tidak dapat dipindahkan ke desa lain.");
    if (!VILLAGES.some((village) => village.id === input.villageId))
      throw new Error("Desa tidak dikenal.");
    // Patch hanya kolom yang boleh diedit; data pegawai, NO, dan lokasi tetap.
    const row = previous
      ? { ...previous }
      : {
          ...emptyRow(input.villageId),
          id: crypto.randomUUID(),
          no:
            data.rows.reduce(
              (maximum, item) =>
                item.villageId === input.villageId
                  ? Math.max(maximum, item.no)
                  : maximum,
              0,
            ) + 1,
        };
    for (const key of EDITABLE_FIELDS)
      Object.assign(row, { [key]: input[key] });
    row.hak = hak;
    row.su = normalizeSu(input.su);
    row.revision = (previous?.revision ?? 0) + 1;
    data.rows = previous
      ? data.rows.map((item) => (item.id === row.id ? row : item))
      : [...data.rows, row];
    this.write(data);
    return row;
  }

  async delete(id: string, revision: number): Promise<void> {
    await this.wait();
    const data = this.read();
    const previous = data.rows.find((row) => row.id === id);
    if (!previous) throw new Error("Data sudah dihapus. Muat ulang daftar.");
    if (previous.revision !== revision)
      throw new Error(
        "Data berubah di tab lain. Muat ulang sebelum menghapus.",
      );
    this.write({ ...data, rows: data.rows.filter((row) => row.id !== id) });
  }
}

export function createInventoryService(): InventoryService {
  // Akses localStorage ditunda agar error izin dapat ditampilkan oleh UI.
  return new MockInventoryService({
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
  });
}
