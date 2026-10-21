import { test, expect, type Page } from "@playwright/test";
import type { InventoryRow } from "../src/domain";

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.locator("#hak")).toHaveValue("1024");
  await expect(
    page.getByRole("button", { name: "Cari data", exact: true }),
  ).toBeEnabled();
}
async function search(page: Page, hak: string) {
  await page.locator("#cari-hak").fill(hak);
  await page.getByRole("button", { name: "Cari data", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Cari data", exact: true }),
  ).toBeEnabled();
}
async function stored(page: Page): Promise<InventoryRow[]> {
  return page.evaluate(
    () => JSON.parse(localStorage.getItem("bt-su:demo:v1")!).rows,
  );
}
async function confirmOverwrite(page: Page) {
  await page
    .getByRole("button", { name: "Ya, simpan perubahan", exact: true })
    .click();
}

test("alur berikutnya, data parsial, celah tanpa baris otomatis dan pemilihan duplikat", async ({
  page,
}) => {
  await ready(page);
  await expect(
    page.getByText("Mode Demo — Belum terhubung ke Google Sheets"),
  ).toBeVisible();
  await expect(page.locator("#su")).toHaveValue("040");
  await page
    .getByRole("button", { name: "Simpan & Berikutnya", exact: true })
    .click();
  await expect(page.locator("#hak")).toHaveValue("1025");
  await expect(page.locator("#su")).toHaveValue("40");
  await expect(page.locator("#luas")).toHaveValue("");
  await page
    .getByRole("button", { name: "Simpan & Berikutnya", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Belum ada data", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tambah nomor hak 1026", exact: true }),
  ).toBeVisible();
  expect(
    (await stored(page)).filter((row) => row.villageId === "sukamaju"),
  ).toHaveLength(37);
  await search(page, "1027");
  await expect(page.locator(".duplicate-choice")).toHaveCount(2);
  await expect(page.locator("#hak")).toHaveCount(0);
  await page.locator(".duplicate-choice").last().click();
  await expect(page.locator("#pertama")).toHaveValue("Pemilik Fiktif Duplikat");
  await page.locator("#akhir").fill("Fiktif Baris Terpilih");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("berhasil disimpan");
  const matches = (await stored(page)).filter(
    (row) => row.villageId === "sukamaju" && row.hak === "1027",
  );
  expect(matches.find((row) => row.no === 37)?.pemilikAkhir).toBe(
    "Fiktif Baris Terpilih",
  );
  expect(matches.find((row) => row.no !== 37)?.pemilikAkhir).toBe(
    "Pemilik Demo 04",
  );
});

test("CRUD, format teks, keterangan multi pilihan, persistensi dan konfirmasi hapus", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Tambah data", exact: true }).click();
  await page.locator("#hak").fill("50001");
  await page.locator("#su").fill("SU SU 040");
  await expect(page.locator("#su")).toHaveValue("040");
  await page.locator("#tahun").fill("2024");
  await page.locator("#nib").fill("00001.02.00003");
  await page.locator("#luas").fill("1250,5");
  await expect(page.locator("#luas-help")).toHaveText("1.250,5 m²");
  await page.locator("#lembar").fill("A-3/4");
  await page.locator("#kotak").fill("08-2");
  await page.locator("#pertama").fill("Nama Fiktif Pertama");
  await expect(page.locator("#akhir")).toHaveValue("");
  await page
    .getByRole("button", { name: "Salin pemilik pertama", exact: true })
    .click();
  await expect(page.locator("#akhir")).toHaveValue("Nama Fiktif Pertama");
  await page.getByRole("button", { name: "Hibah", exact: true }).click();
  await page.getByRole("button", { name: "Roya", exact: true }).click();
  await page
    .locator("#keterangan")
    .pressSequentially("Catatan fiktif beberapa kata");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "50001 berhasil disimpan",
  );
  const row = (await stored(page)).find((row) => row.hak === "50001")!;
  expect(row).toMatchObject({
    no: 38,
    su: "SU 040",
    nib: "00001.02.00003",
    luas: 1250.5,
    lembar: "A-3/4",
    kotak: "08-2",
    keterangan: "Hibah; Roya; Catatan fiktif beberapa kata",
  });
  await page.reload();
  await expect(page.locator("#hak")).toHaveValue("1024");
  await search(page, "50001");
  await expect(page.locator("#nib")).toHaveValue("00001.02.00003");
  await expect(page.locator("#keterangan")).toHaveValue(
    "Catatan fiktif beberapa kata",
  );
  await page.locator("#kotak").fill("E-5");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("KOTAK");
  await confirmOverwrite(page);
  await expect(page.getByRole("status")).toContainText("berhasil disimpan");
  await page.getByRole("button", { name: "Hapus", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "desa Sukamaju, nomor hak 50001",
  );
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  expect(
    (await stored(page)).some(
      (item) => item.id === row.id && item.hak === "50001",
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Hapus", exact: true }).click();
  await page
    .getByRole("button", { name: "Ya, hapus data", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("berhasil dihapus");
  expect((await stored(page)).some((item) => item.id === row.id)).toBe(false);
});

test("kolom pegawai dan NO tetap utuh saat input utama diubah", async ({
  page,
}) => {
  await ready(page);
  const before = (await stored(page)).find(
    (row) => row.id === "demo-sukamaju-0",
  )!;
  await page
    .locator("summary")
    .filter({ hasText: "Data lanjutan pegawai" })
    .click();
  for (const label of ["KUPT", "CEK", "KAPLING", "STATUS FISIK", "KW"]) {
    await expect(page.getByLabel(label, { exact: true })).toHaveAttribute(
      "readonly",
      "",
    );
  }
  await page.locator("#pertama").fill("Pemilik Fiktif Diperbarui");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await confirmOverwrite(page);
  await expect(page.getByRole("status")).toContainText("berhasil disimpan");
  const after = (await stored(page)).find((row) => row.id === before.id)!;
  for (const key of [
    "kupt",
    "cek",
    "kapling",
    "statusFisik",
    "kw",
    "no",
    "desa",
    "kecamatan",
    "nib",
    "su",
    "lembar",
    "kotak",
  ] as const)
    expect(after[key]).toBe(before[key]);
});

test("peringatan perpindahan desa, data, dan input luas yang belum valid", async ({
  page,
}) => {
  await ready(page);
  await page.locator("#luas").fill("belum valid");
  await page.locator("#desa").selectOption("sumberharjo");
  await expect(page.getByRole("dialog")).toContainText(
    "Ada perubahan belum disimpan",
  );
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(page.locator("#desa")).toHaveValue("sukamaju");
  await expect(page.locator("#luas")).toHaveValue("belum valid");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.locator("#luas")).toHaveAttribute("aria-invalid", "true");
  await page
    .getByRole("button", {
      name: "Buka nomor hak 1025, nomor urut 2",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(page.locator("#hak")).toHaveValue("1024");
  await page.locator("#desa").selectOption("sumberharjo");
  await page
    .getByRole("button", { name: "Lanjut tanpa menyimpan", exact: true })
    .click();
  await expect(page.locator("#desa")).toHaveValue("sumberharjo");
  await expect(page.locator(".district-info strong")).toHaveText("Wanasari");
  await expect(page.locator("#hak")).toHaveValue("1024");
  await expect(page.locator("#luas")).toHaveValue("1250");
});

test("Enter biasa tidak menyimpan; Ctrl+Enter menyimpan parsial lalu membuka nomor berikutnya", async ({
  page,
}) => {
  await ready(page);
  await search(page, "1025");
  await page.locator("#nib").fill("000.001");
  await page.locator("#nib").press("Enter");
  expect(
    (await stored(page)).find((row) => row.id === "demo-sukamaju-1")?.nib,
  ).toBe("");
  await expect(page.locator("#hak")).toHaveValue("1025");
  await page.locator("#nib").press("Control+Enter");
  await expect(
    page.getByRole("heading", { name: "Belum ada data", exact: true }),
  ).toBeVisible();
  const saved = (await stored(page)).find(
    (row) => row.id === "demo-sukamaju-1",
  )!;
  expect(saved.nib).toBe("000.001");
  expect(saved.luas).toBeNull();
  expect(saved.pemilikAkhir).toBe("");
  await page
    .getByRole("button", { name: "Tambah nomor hak 1026", exact: true })
    .click();
  await expect(page.locator("#hak")).toHaveValue("1026");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "1026 berhasil disimpan",
  );
});

test("tabel mencari empat kategori dan hanya merender satu halaman", async ({
  page,
}) => {
  await ready(page);
  await expect(page.locator("tbody tr")).toHaveCount(8);
  await expect(page.getByText("Halaman 1 dari 5")).toBeVisible();
  await page
    .getByRole("button", { name: "Halaman berikutnya", exact: true })
    .click();
  await expect(page.getByText("Halaman 2 dari 5")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(8);
  for (const query of [
    "1024",
    "SU 040",
    "00123.01.00001",
    "Pemilik Fiktif 01",
  ]) {
    await page
      .getByRole("textbox", { name: "Cari dalam tabel", exact: true })
      .fill(query);
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody tr")).toContainText("1024");
  }
  await page
    .getByRole("textbox", { name: "Cari dalam tabel", exact: true })
    .fill("tidak-ada");
  await expect(page.locator("tbody")).toContainText(
    "Tidak ada data yang cocok",
  );
});

test("gagal simpan mempertahankan isian dan tidak berpindah; retry tidak menggandakan data", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Tambah data", exact: true }).click();
  await page.locator("#hak").fill("80001");
  await page.locator("#nib").fill("000.040");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "bt-su:demo:v1") throw new Error("Storage full");
      original.call(this, key, value);
    };
    Object.assign(window, {
      restoreStorage: () => {
        Storage.prototype.setItem = original;
      },
    });
  });
  await page
    .getByRole("button", { name: "Simpan & Berikutnya", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Penyimpanan gagal");
  await expect(page.locator("#hak")).toHaveValue("80001");
  await expect(page.locator("#nib")).toHaveValue("000.040");
  expect((await stored(page)).some((row) => row.hak === "80001")).toBe(false);
  await page.evaluate(() =>
    (window as unknown as { restoreStorage: () => void }).restoreStorage(),
  );
  // Dua event klik dalam tick yang sama harus tetap menghasilkan satu baris.
  await page
    .getByRole("button", { name: "Simpan", exact: true })
    .evaluate((button) => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
  await expect(page.getByRole("status")).toContainText("berhasil disimpan");
  expect(
    (await stored(page)).filter((row) => row.hak === "80001"),
  ).toHaveLength(1);
});

test("salin pemilik meminta konfirmasi sebelum mengganti isian yang sudah ada", async ({
  page,
}) => {
  await ready(page);
  await search(page, "1028");
  await expect(page.locator("#akhir")).toHaveValue("Pemilik Demo 05");
  await page
    .getByRole("button", { name: "Salin pemilik pertama", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Pemilik Demo 05");
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(page.locator("#akhir")).toHaveValue("Pemilik Demo 05");
  await page
    .getByRole("button", { name: "Salin pemilik pertama", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ya, salin nama", exact: true })
    .click();
  await expect(page.locator("#akhir")).toHaveValue("Pemilik Fiktif 05");
});

test("nomor hak duplikat baru meminta konfirmasi dan tidak menimpa baris lama", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Tambah data", exact: true }).click();
  await page.locator("#hak").fill("1024");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Nomor hak sudah digunakan",
  );
  await page
    .getByRole("button", { name: "Simpan baris terpisah", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("berhasil disimpan");
  expect(
    (await stored(page)).filter(
      (row) => row.villageId === "sukamaju" && row.hak === "1024",
    ),
  ).toHaveLength(2);
  await search(page, "1024");
  await expect(page.locator(".duplicate-choice")).toHaveCount(2);
});

test("akses laptop dan ponsel, tanpa error browser atau scroll horizontal halaman", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Simpan & Berikutnya", exact: true }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Panduan demo", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});
