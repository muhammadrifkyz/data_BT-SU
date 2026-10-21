export const VILLAGES = [
  { id: "sukamaju", name: "Sukamaju", district: "Sukamakmur" },
  { id: "mekarjaya", name: "Mekarjaya", district: "Sukamakmur" },
  { id: "sumberharjo", name: "Sumberharjo", district: "Wanasari" },
] as const;

export type VillageId = (typeof VILLAGES)[number]["id"];

export interface InventoryRow {
  id: string;
  revision: number;
  villageId: VillageId;
  no: number;
  kecamatan: string;
  desa: string;
  kupt: string;
  hak: string;
  su: string;
  tahunSu: string;
  cek: string;
  nib: string;
  luas: number | null;
  lembar: string;
  kotak: string;
  kapling: string;
  pemilikPertama: string;
  pemilikAkhir: string;
  statusFisik: string;
  kw: string;
  keterangan: string;
}

// Urutan dan label persis mengikuti 18 kolom spreadsheet. ID dan revision
// hanya metadata internal, tidak menggunakan nomor baris spreadsheet.
export const SHEET_COLUMNS = [
  ["NO", "no"],
  ["KECAMATAN", "kecamatan"],
  ["DESA/KELURAHAN", "desa"],
  ["KUPT", "kupt"],
  ["NO. HAK", "hak"],
  ["NO.SU", "su"],
  ["TAHUN SU", "tahunSu"],
  ["CEK", "cek"],
  ["NIB", "nib"],
  ["LUAS", "luas"],
  ["LEMBAR", "lembar"],
  ["KOTAK", "kotak"],
  ["KAPLING", "kapling"],
  ["PEMILIK PERTAMA", "pemilikPertama"],
  ["PEMILIK AKHIR", "pemilikAkhir"],
  ["STATUS FISIK", "statusFisik"],
  ["KW", "kw"],
  ["KETERANGAN", "keterangan"],
] as const satisfies readonly (readonly [string, keyof InventoryRow])[];

export const EDITABLE_FIELDS = [
  "hak",
  "su",
  "tahunSu",
  "nib",
  "luas",
  "lembar",
  "kotak",
  "pemilikPertama",
  "pemilikAkhir",
  "keterangan",
] as const;

export const NOTE_OPTIONS = [
  "Jual beli",
  "Pewarisan",
  "Hibah",
  "Hak tanggungan",
  "Tidak berlaku lagi",
  "Roya",
];

export function normalizeHak(value: string): string {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed))
    throw new Error("NO. HAK wajib diisi dengan angka saja, tanpa awalan HM.");
  return BigInt(trimmed).toString();
}

export function nextHak(value: string): string {
  return (BigInt(normalizeHak(value)) + 1n).toString();
}

export function normalizeSu(value: string): string {
  const number = value
    .trim()
    .replace(/^(?:SU\s*)+/i, "")
    .trim();
  return number ? `SU ${number}` : "";
}

export function suWithoutPrefix(value: string): string {
  return value.replace(/^(?:SU\s*)+/i, "");
}

export function parseNotes(value: string) {
  const parts = value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    selected: NOTE_OPTIONS.filter((option) => parts.includes(option)),
    freeText: parts.filter((part) => !NOTE_OPTIONS.includes(part)).join("; "),
  };
}

export function joinNotes(selected: string[], freeText: string) {
  return [
    ...NOTE_OPTIONS.filter((option) => selected.includes(option)),
    freeText.trim(),
  ]
    .filter(Boolean)
    .join("; ");
}

export function emptyRow(villageId: VillageId, hak = ""): InventoryRow {
  const village = VILLAGES.find((item) => item.id === villageId)!;
  return {
    id: "",
    revision: 0,
    villageId,
    no: 0,
    kecamatan: village.district,
    desa: village.name,
    kupt: "",
    hak,
    su: "",
    tahunSu: "",
    cek: "",
    nib: "",
    luas: null,
    lembar: "",
    kotak: "",
    kapling: "",
    pemilikPertama: "",
    pemilikAkhir: "",
    statusFisik: "",
    kw: "",
    keterangan: "",
  };
}

export function toSheetValues(row: InventoryRow) {
  return SHEET_COLUMNS.map(([, key]) => row[key]);
}

export function overwriteLabels(
  before: InventoryRow,
  after: InventoryRow,
): string[] {
  return EDITABLE_FIELDS.filter(
    (key) =>
      before[key] !== "" && before[key] !== null && before[key] !== after[key],
  ).map((key) => SHEET_COLUMNS.find(([, field]) => field === key)![0]);
}

const areaFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 6,
});
export function formatArea(value: number | null) {
  return value === null ? "—" : `${areaFormatter.format(value)} m²`;
}

// Angka masukan memakai koma desimal Indonesia, tanpa pemisah ribuan.
export function parseArea(value: string): number | null {
  if (!value.trim()) return null;
  if (!/^\d+(?:,\d{1,6})?$/.test(value.trim())) {
    throw new Error(
      "LUAS harus berupa angka tanpa pemisah ribuan. Gunakan koma untuk desimal, misalnya 1250,5.",
    );
  }
  const number = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(number) || number > Number.MAX_SAFE_INTEGER)
    throw new Error("Nilai LUAS terlalu besar.");
  return number;
}

export function areaInput(value: number | null): string {
  return value === null ? "" : String(value).replace(".", ",");
}
