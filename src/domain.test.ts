import { describe, expect, it } from "vitest";
import {
  areaInput,
  emptyRow,
  formatArea,
  joinNotes,
  nextHak,
  normalizeHak,
  normalizeSu,
  overwriteLabels,
  parseArea,
  parseNotes,
  SHEET_COLUMNS,
  toSheetValues,
} from "./domain";

describe("Kontrak kolom dan aturan input", () => {
  it("menyediakan tepat 18 kolom sesuai urutan, NO berbeda dari NO. HAK", () => {
    expect(SHEET_COLUMNS.map(([name]) => name)).toEqual([
      "NO",
      "KECAMATAN",
      "DESA/KELURAHAN",
      "KUPT",
      "NO. HAK",
      "NO.SU",
      "TAHUN SU",
      "CEK",
      "NIB",
      "LUAS",
      "LEMBAR",
      "KOTAK",
      "KAPLING",
      "PEMILIK PERTAMA",
      "PEMILIK AKHIR",
      "STATUS FISIK",
      "KW",
      "KETERANGAN",
    ]);
    const values = toSheetValues({ ...emptyRow("sukamaju", "98765"), no: 3 });
    expect(values).toHaveLength(18);
    expect(values[0]).toBe(3);
    expect(values[4]).toBe("98765");
  });
  it("mempertahankan nol awal SU dan mencegah awalan ganda", () => {
    expect(normalizeSu("040")).toBe("SU 040");
    expect(normalizeSu("40")).toBe("SU 40");
    expect(normalizeSu("SU SU 040")).toBe("SU 040");
    expect(normalizeSu("su 040")).toBe("SU 040");
    expect(normalizeSu("")).toBe("");
    expect(normalizeSu("SU ")).toBe("");
  });
  it("mendukung nomor hak besar, menolak awalan dan menghitung berikutnya dengan tepat", () => {
    expect(normalizeHak("99999")).toBe("99999");
    expect(normalizeHak("0040")).toBe("40");
    expect(nextHak("99999")).toBe("100000");
    expect(nextHak("9007199254740992")).toBe("9007199254740993");
    for (const input of ["", "HM 1", "-1", "1.2", "1e4"])
      expect(() => normalizeHak(input)).toThrow();
  });
  it("luas kosong bukan nol, menerima desimal Indonesia dan menolak format ambigu", () => {
    expect(parseArea("")).toBeNull();
    expect(parseArea("0")).toBe(0);
    expect(parseArea("1250,5")).toBe(1250.5);
    expect(areaInput(1250.5)).toBe("1250,5");
    expect(formatArea(1250.5)).toBe("1.250,5 m²");
    for (const input of ["1.250", "1,250.5", "1.250,5", "-1", "abc", "12 m²"])
      expect(() => parseArea(input)).toThrow();
  });
  it("menggabungkan pilihan dan teks bebas dalam satu nilai kompatibel spreadsheet", () => {
    const value = joinNotes(["Roya", "Jual beli"], "Catatan fiktif");
    expect(value).toBe("Jual beli; Roya; Catatan fiktif");
    expect(parseNotes(value)).toEqual({
      selected: ["Jual beli", "Roya"],
      freeText: "Catatan fiktif",
    });
  });
  it("mendeteksi penggantian maupun pengosongan nilai yang sudah terisi", () => {
    const before = {
      ...emptyRow("sukamaju", "40"),
      pemilikPertama: "Fiktif",
      luas: 0,
    };
    expect(
      overwriteLabels(before, {
        ...before,
        pemilikPertama: "",
        luas: null,
        nib: "00.1",
      }),
    ).toEqual(["LUAS", "PEMILIK PERTAMA"]);
  });
});
