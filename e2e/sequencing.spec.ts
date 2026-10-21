import { expect, test, type Page } from "@playwright/test";
import type { InventoryRow } from "../src/domain";

const suToggle = (page: Page) =>
  page.getByRole("button", { name: "Urutkan otomatis nomor SU", exact: true });
const nibToggle = (page: Page) =>
  page.getByRole("button", { name: "Urutkan otomatis NIB", exact: true });
const saveNextButton = (page: Page) =>
  page.getByRole("button", { name: "Simpan & Berikutnya", exact: true });

async function setup(
  page: Page,
  options: {
    nib?: string;
    su?: string;
    targetSu?: string;
    targetNib?: string;
  } = {},
) {
  await page.goto("/");
  await expect(page.locator("#hak")).toHaveValue("1024");
  await page.evaluate((options) => {
    const key = "bt-su:demo:v1";
    const data = JSON.parse(localStorage.getItem(key)!);
    const source = data.rows.find(
      (row: InventoryRow) => row.id === "demo-sukamaju-0",
    );
    source.su = options.su ?? "SU 040";
    source.nib = options.nib ?? "31.05.04.07.00009";
    const target = data.rows.find(
      (row: InventoryRow) => row.id === "demo-sukamaju-1",
    );
    target.su = options.targetSu ?? "";
    target.nib = options.targetNib ?? "";
    localStorage.setItem(key, JSON.stringify(data));
  }, options);
  await page.reload();
  await expect(page.locator("#hak")).toHaveValue("1024");
  await expect(saveNextButton(page)).toBeEnabled();
}

async function rows(page: Page): Promise<InventoryRow[]> {
  return page.evaluate(
    () => JSON.parse(localStorage.getItem("bt-su:demo:v1")!).rows,
  );
}

async function enableBoth(page: Page) {
  await suToggle(page).click();
  await nibToggle(page).click();
  await expect(suToggle(page)).toHaveAttribute("aria-pressed", "true");
  await expect(nibToggle(page)).toHaveAttribute("aria-pressed", "true");
}

async function find(page: Page, hak: string) {
  await page.locator("#cari-hak").fill(hak);
  await page.getByRole("button", { name: "Cari data", exact: true }).click();
}

test("dua urutan hanya menyiapkan satu draf, koreksi menjadi acuan, tanpa membuat baris berikutnya", async ({
  page,
}) => {
  await setup(page);
  await enableBoth(page);
  await saveNextButton(page).click();
  await expect(page.locator("#hak")).toHaveValue("1025");
  await expect(page.locator("#su")).toHaveValue("041");
  await expect(page.locator("#nib")).toHaveValue("31.05.04.07.00010");
  await expect(
    page.getByText("Saran — belum disimpan", { exact: true }),
  ).toHaveCount(2);
  await expect(page.locator(".status-pill")).toContainText("Belum disimpan");
  let target = (await rows(page)).find((row) => row.id === "demo-sukamaju-1")!;
  expect(target.su).toBe("");
  expect(target.nib).toBe("");
  await page.locator("#su").fill("077");
  await page.locator("#nib").fill("31.05.04.07.00077");
  await saveNextButton(page).click();
  await expect(
    page.getByRole("heading", { name: "Belum ada data", exact: true }),
  ).toBeVisible();
  const pending = page.getByRole("complementary", {
    name: "Saran urutan dokumen berikutnya",
  });
  await expect(pending).toContainText("SU 078");
  await expect(pending).toContainText("31.05.04.07.00078");
  expect(
    (await rows(page)).filter((row) => row.villageId === "sukamaju"),
  ).toHaveLength(37);
  target = (await rows(page)).find((row) => row.id === "demo-sukamaju-1")!;
  expect(target.su).toBe("SU 077");
  expect(target.nib).toBe("31.05.04.07.00077");
  await page
    .getByRole("button", { name: "Tambah nomor hak 1026", exact: true })
    .click();
  await expect(page.locator("#su")).toHaveValue("078");
  await expect(page.locator("#nib")).toHaveValue("31.05.04.07.00078");
  expect(
    (await rows(page)).some(
      (row) => row.villageId === "sukamaju" && row.hak === "1026",
    ),
  ).toBe(false);
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "1026 berhasil disimpan",
  );
  await expect(page.locator("#hak")).toHaveValue("1026");
  await expect(page.locator("#su")).toHaveValue("078");
  const created = (await rows(page)).find(
    (row) => row.villageId === "sukamaju" && row.hak === "1026",
  )!;
  expect(created.su).toBe("SU 078");
  expect(created.nib).toBe("31.05.04.07.00078");
});

test("SU 40 menjadi SU 41; masing-masing urutan bisa digunakan sendiri", async ({
  page,
}) => {
  await setup(page, { su: "SU 40" });
  await suToggle(page).click();
  await saveNextButton(page).click();
  await expect(page.locator("#hak")).toHaveValue("1025");
  await expect(page.locator("#su")).toHaveValue("41");
  await expect(page.locator("#nib")).toHaveValue("");
  await expect(nibToggle(page)).toHaveAttribute("aria-pressed", "false");
  await page.locator("#nib").fill("00009");
  await nibToggle(page).click();
  await suToggle(page).click();
  await expect(page.locator("#su")).toHaveValue("41");
  await saveNextButton(page).click();
  await page
    .getByRole("button", { name: "Tambah nomor hak 1026", exact: true })
    .click();
  await expect(page.locator("#su")).toHaveValue("");
  await expect(page.locator("#nib")).toHaveValue("00010");
});

test("nilai tujuan terisi dipertahankan dan hanya urutan kolom itu dihentikan sampai diaktifkan lagi", async ({
  page,
}) => {
  await setup(page, { targetSu: "SU 500" });
  await enableBoth(page);
  await saveNextButton(page).click();
  await expect(page.locator("#hak")).toHaveValue("1025");
  await expect(page.locator("#su")).toHaveValue("500");
  await expect(page.locator("#nib")).toHaveValue("31.05.04.07.00010");
  await expect(suToggle(page)).toHaveAttribute("aria-pressed", "false");
  await expect(nibToggle(page)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#sequence-su-help")).toContainText(
    "sudah terisi (SU 500)",
  );
  await suToggle(page).click();
  await expect(suToggle(page)).toHaveAttribute("aria-pressed", "true");
  await saveNextButton(page).click();
  await page
    .getByRole("button", { name: "Tambah nomor hak 1026", exact: true })
    .click();
  await expect(page.locator("#su")).toHaveValue("501");
  await expect(page.locator("#nib")).toHaveValue("31.05.04.07.00011");
});

test("NIB tujuan terisi tidak ditimpa dan berhenti meski sama dengan saran", async ({
  page,
}) => {
  await setup(page, { targetNib: "31.05.04.07.00010" });
  await enableBoth(page);
  await saveNextButton(page).click();
  await expect(page.locator("#hak")).toHaveValue("1025");
  await expect(page.locator("#nib")).toHaveValue("31.05.04.07.00010");
  await expect(nibToggle(page)).toHaveAttribute("aria-pressed", "false");
  await expect(suToggle(page)).toHaveAttribute("aria-pressed", "true");
  await saveNextButton(page).click();
  await page
    .getByRole("button", { name: "Tambah nomor hak 1026", exact: true })
    .click();
  await expect(page.locator("#nib")).toHaveValue("");
  await expect(page.locator("#su")).toHaveValue("042");
});

test("overflow NIB meminta input manual tanpa mengubah awalan atau memperlebar segmen", async ({
  page,
}) => {
  await setup(page, { nib: "31.05.04.07.99998" });
  await enableBoth(page);
  await saveNextButton(page).click();
  await expect(page.locator("#nib")).toHaveValue("31.05.04.07.99999");
  await saveNextButton(page).click();
  await expect(page.locator("#sequence-nib-help")).toContainText(
    "melebihi lebar",
  );
  await expect(nibToggle(page)).toHaveAttribute("aria-pressed", "false");
  await page
    .getByRole("button", { name: "Tambah nomor hak 1026", exact: true })
    .click();
  await expect(page.locator("#nib")).toHaveValue("");
  await expect(page.locator("#su")).toHaveValue("042");
  await expect(page.locator("#sequence-nib-help")).toContainText("manual");
  expect(
    (await rows(page)).find((row) => row.id === "demo-sukamaju-1")?.nib,
  ).toBe("31.05.04.07.99999");
});

test("format tidak dikenali ditolak saat aktivasi dan setelah koreksi nilai aktif", async ({
  page,
}) => {
  await setup(page);
  await page.locator("#nib").fill("31..00009");
  await nibToggle(page).click();
  await expect(nibToggle(page)).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#sequence-nib-help")).toContainText("manual");
  await page.locator("#nib").fill("31.00009");
  await enableBoth(page);
  await page.locator("#nib").fill("31..00009");
  await page.locator("#su").fill("040/2020");
  await saveNextButton(page).click();
  await page
    .getByRole("button", { name: "Ya, simpan perubahan", exact: true })
    .click();
  await expect(page.locator("#hak")).toHaveValue("1025");
  await expect(page.locator("#nib")).toHaveValue("");
  await expect(page.locator("#su")).toHaveValue("");
  await expect(nibToggle(page)).toHaveAttribute("aria-pressed", "false");
  await expect(suToggle(page)).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#sequence-su-help")).toContainText("manual");
  await expect(page.locator("#sequence-nib-help")).toContainText("manual");
  const source = (await rows(page)).find(
    (row) => row.id === "demo-sukamaju-0",
  )!;
  expect(source.nib).toBe("31..00009");
  expect(source.su).toBe("SU 040/2020");
});

test("pengaturan reset saat pencarian nomor hak, perpindahan desa, dan memilih baris tabel", async ({
  page,
}) => {
  await setup(page);
  await enableBoth(page);
  await find(page, "1025");
  await expect(page.locator("#hak")).toHaveValue("1025");
  await expect(suToggle(page)).toHaveAttribute("aria-pressed", "false");
  await expect(nibToggle(page)).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#su")).toHaveValue("");
  await find(page, "1024");
  await expect(page.locator("#hak")).toHaveValue("1024");
  await enableBoth(page);
  await page.locator("#desa").selectOption("sumberharjo");
  await expect(page.locator("#desa")).toHaveValue("sumberharjo");
  await expect(page.locator("#hak")).toHaveValue("1024");
  await expect(suToggle(page)).toHaveAttribute("aria-pressed", "false");
  await expect(nibToggle(page)).toHaveAttribute("aria-pressed", "false");
  await enableBoth(page);
  await page
    .getByRole("button", {
      name: "Buka nomor hak 1025, nomor urut 2",
      exact: true,
    })
    .click();
  await expect(page.locator("#hak")).toHaveValue("1025");
  await expect(suToggle(page)).toHaveAttribute("aria-pressed", "false");
  await expect(nibToggle(page)).toHaveAttribute("aria-pressed", "false");
});

test("membatalkan perpindahan mempertahankan saran dan pengaturan; pencarian yang disetujui membuangnya", async ({
  page,
}) => {
  await setup(page);
  await enableBoth(page);
  await saveNextButton(page).click();
  await expect(page.locator("#hak")).toHaveValue("1025");
  await page.locator("#desa").selectOption("mekarjaya");
  await expect(page.getByRole("dialog")).toContainText(
    "perubahan belum disimpan",
  );
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(page.locator("#desa")).toHaveValue("sukamaju");
  await expect(page.locator("#nib")).toHaveValue("31.05.04.07.00010");
  await expect(nibToggle(page)).toHaveAttribute("aria-pressed", "true");
  await find(page, "1024");
  await page
    .getByRole("button", { name: "Lanjut tanpa menyimpan", exact: true })
    .click();
  await expect(page.locator("#hak")).toHaveValue("1024");
  await expect(suToggle(page)).toHaveAttribute("aria-pressed", "false");
  await expect(nibToggle(page)).toHaveAttribute("aria-pressed", "false");
  expect(
    (await rows(page)).find((row) => row.id === "demo-sukamaju-1")?.nib,
  ).toBe("");
});

test("gagal simpan tidak memajukan urutan, retry dan klik ganda hanya menyiapkan +1", async ({
  page,
}) => {
  await setup(page);
  await enableBoth(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {
      throw new Error("quota");
    };
    Object.assign(window, {
      restoreStorage: () => {
        Storage.prototype.setItem = original;
      },
    });
  });
  await saveNextButton(page).click();
  await expect(page.getByRole("alert")).toContainText("Penyimpanan gagal");
  await expect(page.locator("#hak")).toHaveValue("1024");
  await expect(page.locator("#nib")).toHaveValue("31.05.04.07.00009");
  await expect(nibToggle(page)).toHaveAttribute("aria-pressed", "true");
  expect(
    (await rows(page)).find((row) => row.id === "demo-sukamaju-0")?.revision,
  ).toBe(1);
  await page.evaluate(() =>
    (window as unknown as { restoreStorage: () => void }).restoreStorage(),
  );
  await saveNextButton(page).evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect(page.locator("#hak")).toHaveValue("1025");
  await expect(page.locator("#su")).toHaveValue("041");
  await expect(page.locator("#nib")).toHaveValue("31.05.04.07.00010");
  expect(
    (await rows(page)).find((row) => row.id === "demo-sukamaju-0")?.revision,
  ).toBe(2);
  expect(
    (await rows(page)).find((row) => row.id === "demo-sukamaju-1")?.revision,
  ).toBe(1);
});

test("Simpan biasa dan batal konfirmasi tidak memajukan urutan; hasil simpan menjadi acuan", async ({
  page,
}) => {
  await setup(page);
  await enableBoth(page);
  await page.locator("#su").fill("080");
  await page.locator("#nib").fill("31.05.04.07.00080");
  await saveNextButton(page).click();
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(page.locator("#hak")).toHaveValue("1024");
  await expect(page.locator("#su")).toHaveValue("080");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await page
    .getByRole("button", { name: "Ya, simpan perubahan", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("berhasil disimpan");
  await expect(page.locator("#hak")).toHaveValue("1024");
  await expect(page.locator("#su")).toHaveValue("080");
  await saveNextButton(page).click();
  await expect(page.locator("#hak")).toHaveValue("1025");
  await expect(page.locator("#su")).toHaveValue("081");
  await expect(page.locator("#nib")).toHaveValue("31.05.04.07.00081");
});

test("nomor hak duplikat menunggu pilihan lalu hanya menyarankan kolom kosong di baris terpilih", async ({
  page,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "Tambah data", exact: true }).click();
  await page.locator("#hak").fill("1026");
  await page.locator("#su").fill("040");
  await page.locator("#nib").fill("31.00009");
  await enableBoth(page);
  await saveNextButton(page).click();
  await expect(page.locator(".duplicate-choice")).toHaveCount(2);
  await expect(page.locator("#nib")).toHaveCount(0);
  const before = (await rows(page)).filter(
    (row) => row.villageId === "sukamaju" && row.hak === "1027",
  );
  await expect(page.locator(".pending-sequence")).toContainText("31.00010");
  await page.locator(".duplicate-choice").last().click();
  await expect(page.locator("#su")).toHaveValue("099");
  await expect(suToggle(page)).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#nib")).toHaveValue("31.00010");
  expect(
    (await rows(page)).filter(
      (row) => row.villageId === "sukamaju" && row.hak === "1027",
    ),
  ).toEqual(before);
});

test("urutan dapat dimatikan dan diaktifkan kembali ketika menunggu tambah data berikutnya", async ({
  page,
}) => {
  await setup(page);
  await enableBoth(page);
  await saveNextButton(page).click();
  await expect(page.locator("#hak")).toHaveValue("1025");
  await saveNextButton(page).click();
  await expect(page.locator(".pending-sequence")).toBeVisible();
  await suToggle(page).click();
  await nibToggle(page).click();
  await expect(suToggle(page)).toHaveAttribute("aria-pressed", "false");
  await expect(nibToggle(page)).toHaveAttribute("aria-pressed", "false");
  await suToggle(page).click();
  await expect(page.locator(".pending-sequence")).toContainText("SU 042");
  await page
    .getByRole("button", { name: "Tambah nomor hak 1026", exact: true })
    .click();
  await expect(page.locator("#su")).toHaveValue("042");
  await expect(page.locator("#nib")).toHaveValue("");
});
