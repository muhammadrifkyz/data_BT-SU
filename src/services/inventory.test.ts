import { beforeEach, describe, expect, it } from "vitest";
import { emptyRow } from "../domain";
import { createDemoRows, MockInventoryService, STORAGE_KEY } from "./inventory";

class MemoryStorage {
  data = new Map<string, string>();
  failWrites = false;
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error("quota");
    this.data.set(key, value);
  }
}

let storage: MemoryStorage;
let service: MockInventoryService;
beforeEach(() => {
  storage = new MemoryStorage();
  service = new MockInventoryService(storage, 0);
});

describe("Layanan mock inventaris", () => {
  it("menyediakan data parsial, data pegawai, duplikat, dan celah yang tidak dibuat otomatis", async () => {
    const [complete] = await service.findByHak("sukamaju", "1024");
    const [partial] = await service.findByHak("sukamaju", "1025");
    expect(complete.su).toBe("SU 040");
    expect(complete.kupt).toBe("KUPT-DEMO-07");
    expect(partial.su).toBe("SU 40");
    expect(partial.luas).toBeNull();
    expect(await service.findByHak("sukamaju", "1027")).toHaveLength(2);
    expect(await service.findByHak("sukamaju", "1026")).toEqual([]);
    expect((await service.list("sukamaju", "", 1, 8)).total).toBe(37);
  });
  it("tambah parsial, baca ulang, edit dan hapus menggunakan ID tetap", async () => {
    const created = await service.save(emptyRow("sukamaju", "50000"));
    expect(created.id).toBeTruthy();
    expect(created.no).toBe(38);
    expect(created.luas).toBeNull();
    expect(created.pemilikAkhir).toBe("");
    const updated = await service.save({
      ...created,
      nib: "0001.02.00003",
      lembar: "A-3/4",
      kotak: "08-2",
      su: "040",
    });
    expect(updated.id).toBe(created.id);
    const [loaded] = await new MockInventoryService(storage, 0).findByHak(
      "sukamaju",
      "50000",
    );
    expect(loaded).toMatchObject({
      nib: "0001.02.00003",
      lembar: "A-3/4",
      kotak: "08-2",
      su: "SU 040",
    });
    await service.delete(loaded.id, loaded.revision);
    expect(await service.findByHak("sukamaju", "50000")).toEqual([]);
  });
  it("mempertahankan kolom pegawai, nomor urut, lokasi, dan keterangan yang tak diedit", async () => {
    const [before] = await service.findByHak("sukamaju", "1024");
    const updated = await service.save({
      ...before,
      hak: "75000",
      pemilikAkhir: "Pemilik Fiktif Baru",
      kupt: "BAD",
      cek: "BAD",
      kapling: "BAD",
      kw: "BAD",
      statusFisik: "BAD",
      kecamatan: "BAD",
      desa: "BAD",
      no: 75000,
    });
    for (const key of [
      "kupt",
      "cek",
      "kapling",
      "kw",
      "statusFisik",
      "kecamatan",
      "desa",
      "no",
      "keterangan",
    ] as const)
      expect(updated[key]).toEqual(before[key]);
    expect(updated.hak).toBe("75000");
    expect(updated.pemilikPertama).toBe(before.pemilikPertama);
  });
  it("nomor hak sama tidak menimpa baris; edit/hapus hanya menyentuh ID yang dipilih", async () => {
    const original = await service.findByHak("sukamaju", "1027");
    const added = await service.save({
      ...emptyRow("sukamaju", "1027"),
      pemilikPertama: "Demo Tambahan",
    });
    expect(await service.findByHak("sukamaju", "1027")).toHaveLength(3);
    await service.save({ ...original[0], pemilikAkhir: "Fiktif Terpilih" });
    await service.delete(added.id, added.revision);
    const rows = await service.findByHak("sukamaju", "1027");
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual(original[1]);
  });
  it("mengisolasi desa dan mengisi kecamatan mengikuti konfigurasi", async () => {
    const created = await service.save(emptyRow("sumberharjo", "99999"));
    expect(created.kecamatan).toBe("Wanasari");
    expect(created.desa).toBe("Sumberharjo");
    expect(await service.findByHak("sukamaju", "99999")).toEqual([]);
    expect(await service.findByHak("mekarjaya", "99999")).toEqual([]);
  });
  it("mencari hak, SU, NIB, pemilik pertama/akhir dan mengembalikan satu halaman", async () => {
    for (const query of [
      "1024",
      "SU 040",
      "00123.01.00001",
      "Pemilik Fiktif 01",
    ]) {
      expect((await service.list("sukamaju", query, 1, 8)).rows[0].hak).toBe(
        "1024",
      );
    }
    expect(
      (await service.list("sukamaju", "Pemilik Demo 03", 1, 8)).total,
    ).toBe(0);
    expect(
      (await service.list("sukamaju", "Pemilik Demo 04", 1, 8)).rows[0].hak,
    ).toBe("1027");
    const first = await service.list("sukamaju", "", 1, 8);
    const second = await service.list("sukamaju", "", 2, 8);
    expect(first.rows).toHaveLength(8);
    expect(second.rows).toHaveLength(8);
    expect(
      second.rows.some((row) =>
        first.rows.some((other) => row.id === other.id),
      ),
    ).toBe(false);
  });
  it("melindungi perubahan lintas tab dan mempertahankan data setelah gagal simpan", async () => {
    const [first] = await service.findByHak("sukamaju", "1024");
    await service.save({ ...first, pemilikAkhir: "Tab pertama" });
    await expect(
      service.save({ ...first, pemilikAkhir: "Tab kedua" }),
    ).rejects.toThrow("tab lain");
    await expect(service.delete(first.id, first.revision)).rejects.toThrow(
      "tab lain",
    );
    storage.failWrites = true;
    await expect(service.save(emptyRow("sukamaju", "99999"))).rejects.toThrow(
      "Penyimpanan gagal",
    );
    expect(await service.findByHak("sukamaju", "99999")).toEqual([]);
    expect((await service.findByHak("sukamaju", "1024"))[0].pemilikAkhir).toBe(
      "Tab pertama",
    );
  });
  it("menolak data rusak tanpa menimpa dan melaporkan storage yang diblokir", async () => {
    storage.setItem(STORAGE_KEY, "{invalid");
    await expect(service.list("sukamaju", "", 1, 8)).rejects.toThrow(
      "Data demo di browser tidak valid",
    );
    expect(storage.getItem(STORAGE_KEY)).toBe("{invalid");
    const blocked = new MockInventoryService(
      {
        getItem: () => {
          throw new Error("denied");
        },
        setItem: () => {},
      },
      0,
    );
    await expect(blocked.findByHak("sukamaju", "1024")).rejects.toThrow(
      "tidak dapat dibaca",
    );
  });
  it("pagination tetap membatasi hasil untuk puluhan ribu baris", async () => {
    const template = createDemoRows()[0];
    const rows = Array.from({ length: 30000 }, (_, index) => ({
      ...template,
      id: `load-${index}`,
      no: index + 1,
      hak: String(index + 1),
    }));
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, rows }));
    const result = await service.list("sukamaju", "", 3750, 8);
    expect(result.total).toBe(30000);
    expect(result.rows).toHaveLength(8);
    expect(result.rows.at(-1)?.hak).toBe("30000");
  });
  it("memvalidasi nomor hak, tahun dan luas tanpa menuntut kolom lain", async () => {
    await expect(service.save(emptyRow("sukamaju", "HM1"))).rejects.toThrow(
      "angka saja",
    );
    await expect(
      service.save({ ...emptyRow("sukamaju", "90000"), tahunSu: "20" }),
    ).rejects.toThrow("4 angka");
    await expect(
      service.save({ ...emptyRow("sukamaju", "90000"), luas: -1 }),
    ).rejects.toThrow("nol atau lebih");
    const row = await service.save({
      ...emptyRow("sukamaju", "90000"),
      luas: 0,
    });
    expect(row.luas).toBe(0);
    expect(row.su).toBe("");
  });
});
