import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Database,
  FileSearch,
  FolderOpen,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  areaInput,
  emptyRow,
  nextHak,
  normalizeHak,
  normalizeSu,
  overwriteLabels,
  VILLAGES,
  type InventoryRow,
  type VillageId,
} from "./domain";
import { createInventoryService, type PageResult } from "./services/inventory";
import { RecordForm } from "./components/RecordForm";
import { InventoryTable, PAGE_SIZE } from "./components/InventoryTable";
import { Dialog } from "./components/Dialog";

const service = createInventoryService();
type EditorMode = "record" | "empty" | "duplicates" | "loading";
interface Confirmation {
  title: string;
  message: string;
  accept: string;
  danger?: boolean;
  resolve: (answer: boolean) => void;
}
interface Notice {
  type: "success" | "error" | "info";
  text: string;
}

export default function App() {
  const [villageId, setVillageId] = useState<VillageId>("sukamaju");
  const village = VILLAGES.find((item) => item.id === villageId)!;
  const [searchHak, setSearchHak] = useState("1024");
  const [mode, setMode] = useState<EditorMode>("loading");
  const [draft, setDraft] = useState<InventoryRow | null>(null);
  const [original, setOriginal] = useState<InventoryRow | null>(null);
  const [area, setArea] = useState("");
  const [formSession, setFormSession] = useState(0);
  const [missingHak, setMissingHak] = useState("1024");
  const [duplicates, setDuplicates] = useState<InventoryRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [finding, setFinding] = useState(false);
  const locked = useRef(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PageResult>({ rows: [], total: 0 });
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const dirty =
    !!draft &&
    !!original &&
    (JSON.stringify(draft) !== JSON.stringify(original) ||
      area !== areaInput(original.luas));
  const working = busy || finding;

  const ask = (options: Omit<Confirmation, "resolve">) =>
    new Promise<boolean>((resolve) => setConfirmation({ ...options, resolve }));
  const answer = (value: boolean) => {
    confirmation?.resolve(value);
    setConfirmation(null);
  };
  const openRow = useCallback((row: InventoryRow) => {
    setDraft({ ...row });
    setOriginal({ ...row });
    setArea(areaInput(row.luas));
    setMode("record");
    setFormSession((count) => count + 1);
  }, []);
  const showMatches = useCallback(
    (rows: InventoryRow[], hak: string) => {
      setSearchHak(hak);
      if (rows.length === 1) openRow(rows[0]);
      else {
        setDraft(null);
        setOriginal(null);
        setMissingHak(hak);
        setDuplicates(rows);
        setMode(rows.length ? "duplicates" : "empty");
      }
    },
    [openRow],
  );

  useEffect(() => {
    let active = true;
    setFinding(true);
    setMode("loading");
    setDraft(null);
    setOriginal(null);
    setNotice(null);
    service
      .findByHak(villageId, "1024")
      .then((rows) => {
        if (active) showMatches(rows, "1024");
      })
      .catch((error) => {
        if (active) {
          setNotice({ type: "error", text: error.message });
          setMode("empty");
        }
      })
      .finally(() => {
        if (active) setFinding(false);
      });
    return () => {
      active = false;
    };
  }, [villageId, showMatches]);

  useEffect(() => {
    let active = true;
    setListLoading(true);
    setListError("");
    const timer = window.setTimeout(
      () => {
        service
          .list(villageId, query, page, PAGE_SIZE)
          .then((data) => {
            if (active) {
              setResult(data);
              const last = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
              if (page > last) setPage(last);
            }
          })
          .catch((error) => {
            if (active) setListError(error.message);
          })
          .finally(() => {
            if (active) setListLoading(false);
          });
      },
      query ? 180 : 0,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [villageId, query, page, refresh]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    const update = (event: StorageEvent) => {
      if (event.key === "bt-su:demo:v1") setRefresh((count) => count + 1);
    };
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);

  const canLeave = async () => {
    if (working || locked.current) return false;
    return (
      !dirty ||
      (await ask({
        title: "Ada perubahan belum disimpan",
        message:
          "Perubahan pada formulir ini akan hilang jika Anda berpindah. Tetap di sini untuk menyimpan, atau lanjutkan tanpa menyimpan.",
        accept: "Lanjut tanpa menyimpan",
        danger: true,
      }))
    );
  };

  const search = async () => {
    if (!(await canLeave())) return;
    let hak: string;
    try {
      hak = normalizeHak(searchHak);
    } catch (error) {
      setNotice({ type: "error", text: (error as Error).message });
      return;
    }
    setFinding(true);
    setNotice(null);
    try {
      showMatches(await service.findByHak(villageId, hak), hak);
    } catch (error) {
      setNotice({ type: "error", text: (error as Error).message });
    } finally {
      setFinding(false);
    }
  };

  const add = async (hak = "") => {
    if (!(await canLeave())) return;
    openRow(emptyRow(villageId, hak));
    setNotice(null);
    window.setTimeout(() => document.getElementById("hak")?.focus(), 0);
  };

  const save = async (andNext: boolean, parsedArea: number | null) => {
    if (!draft || locked.current || finding) return;
    locked.current = true;
    setBusy(true);
    setNotice(null);
    let saved: InventoryRow;
    try {
      const input = {
        ...draft,
        hak: normalizeHak(draft.hak),
        su: normalizeSu(draft.su),
        luas: parsedArea,
      };
      if (input.tahunSu && !/^\d{4}$/.test(input.tahunSu))
        throw new Error(
          "TAHUN SU harus terdiri dari 4 angka, atau dikosongkan.",
        );
      const overwrites = original?.id ? overwriteLabels(original, input) : [];
      if (
        overwrites.length &&
        !(await ask({
          title: "Simpan perubahan data yang sudah terisi?",
          message: `Desa ${village.name}, nomor hak ${original!.hak}. Nilai lama pada ${overwrites.join(", ")} akan diganti oleh isian Anda. Kolom pegawai tetap dipertahankan.`,
          accept: "Ya, simpan perubahan",
        }))
      )
        return;
      if (!input.id || input.hak !== original?.hak) {
        const sameHak = (await service.findByHak(villageId, input.hak)).filter(
          (row) => row.id !== input.id,
        );
        if (
          sameHak.length &&
          !(await ask({
            title: "Nomor hak sudah digunakan",
            message: `Desa ${village.name} sudah memiliki ${sameHak.length} data untuk nomor hak ${input.hak}. Simpan sebagai baris terpisah? Data yang ada tidak akan ditimpa.`,
            accept: "Simpan baris terpisah",
          }))
        )
          return;
      }
      saved = await service.save(input);
      openRow(saved);
      setRefresh((count) => count + 1);
      setNotice({
        type: "success",
        text: `Nomor hak ${saved.hak} berhasil disimpan di desa ${saved.desa}.`,
      });
      if (andNext) {
        const following = nextHak(saved.hak);
        try {
          showMatches(await service.findByHak(villageId, following), following);
        } catch (error) {
          setNotice({
            type: "error",
            text: `Data ${saved.hak} sudah tersimpan, tetapi nomor berikutnya gagal dimuat: ${(error as Error).message}`,
          });
        }
      }
    } catch (error) {
      setNotice({ type: "error", text: (error as Error).message });
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!draft?.id || locked.current || working) return;
    const row = original ?? draft;
    const confirmed = await ask({
      title: "Hapus data inventaris?",
      message: `Hapus data desa ${village.name}, nomor hak ${row.hak} (NO ${row.no})?${dirty ? " Perubahan yang belum disimpan juga akan dibuang." : ""} Tindakan ini tidak dapat dibatalkan.`,
      accept: "Ya, hapus data",
      danger: true,
    });
    if (!confirmed) return;
    locked.current = true;
    setBusy(true);
    try {
      await service.delete(row.id, row.revision);
      showMatches([], row.hak);
      setRefresh((count) => count + 1);
      setNotice({
        type: "success",
        text: `Nomor hak ${row.hak} di desa ${village.name} berhasil dihapus.`,
      });
    } catch (error) {
      setNotice({ type: "error", text: (error as Error).message });
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a href="#" className="brand" aria-label="Arsip Tanah beranda">
            <span className="brand-mark">
              <BookOpen size={23} strokeWidth={1.7} />
            </span>
            <span>
              Arsip<span className="brand-light">Tanah</span>
              <small>RUANG KERJA INVENTARIS</small>
            </span>
          </a>
          <nav aria-label="Navigasi utama">
            <a className="nav-active" href="#workspace">
              <FolderOpen size={16} /> Inventaris
            </a>
            <button onClick={() => setHelpOpen(true)}>
              <CircleHelp size={16} /> Panduan demo
            </button>
          </nav>
          <span className="header-demo">
            <span /> PROTOTIPE
          </span>
        </div>
      </header>
      <main id="workspace" className="workspace">
        <div className="breadcrumb">
          Ruang kerja <ChevronRight size={13} />
          <span>Inventaris BT & SU</span>
        </div>
        <div className="page-heading">
          <div>
            <div className="eyebrow">ARSIP PERTANAHAN</div>
            <h1>
              Inventaris Buku Tanah & Surat Ukur<span>.</span>
            </h1>
            <p>Lebih sedikit mencari. Lebih cepat melengkapi.</p>
          </div>
          <div className="page-heading-note">
            <ShieldCheck size={17} />
            <span>
              Data demo fiktif<small>Aman untuk mencoba</small>
            </span>
          </div>
        </div>
        <div className="demo-banner">
          <InfoIcon />
          <div>
            <strong>Mode Demo — Belum terhubung ke Google Sheets</strong>
            <span>
              Semua perubahan hanya tersimpan di browser ini. Gunakan data
              fiktif untuk mencoba.
            </span>
          </div>
          <span className="demo-tag">DEMO LOKAL</span>
        </div>
        <section
          className="workspace-toolbar"
          aria-label="Pilih desa dan cari dokumen"
        >
          <div className="village-select">
            <label htmlFor="desa">
              <MapPin size={14} /> DESA / KELURAHAN
            </label>
            <select
              id="desa"
              value={villageId}
              disabled={working}
              onChange={async (event) => {
                const next = event.target.value as VillageId;
                if (await canLeave()) {
                  setVillageId(next);
                  setPage(1);
                  setQuery("");
                  setResult({ rows: [], total: 0 });
                }
              }}
            >
              {VILLAGES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="district-info">
            <span>KECAMATAN</span>
            <strong>{village.district}</strong>
            <small>Terisi otomatis</small>
          </div>
          <form
            className="hak-search"
            onSubmit={(event) => {
              event.preventDefault();
              void search();
            }}
          >
            <label htmlFor="cari-hak">CARI NOMOR HAK</label>
            <div>
              <span className="search-input">
                <Search size={17} />
                <input
                  id="cari-hak"
                  value={searchHak}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Masukkan nomor hak"
                  onChange={(event) => setSearchHak(event.target.value)}
                  disabled={working}
                />
              </span>
              <button className="button button-dark" disabled={working}>
                {finding ? "Mencari…" : "Cari data"}
                <ArrowRight size={15} />
              </button>
            </div>
          </form>
          <button
            className="button button-secondary add-button"
            disabled={working}
            onClick={() => void add()}
          >
            <Plus size={17} /> Tambah data
          </button>
        </section>
        <div className="workflow-line">
          <span>
            <i /> Desa {village.name}
            <span className="muted"> / {village.district}</span>
          </span>
          <span>
            <kbd>Ctrl</kbd> + <kbd>Enter</kbd> untuk input lebih cepat
          </span>
        </div>
        {notice && (
          <div
            className={`notice notice-${notice.type}`}
            role={notice.type === "error" ? "alert" : "status"}
          >
            {notice.type === "success" ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span>{notice.text}</span>
            <button
              className="icon-button"
              onClick={() => setNotice(null)}
              aria-label="Tutup pemberitahuan"
            >
              <X size={16} />
            </button>
          </div>
        )}
        {mode === "record" && draft ? (
          <RecordForm
            key={formSession}
            draft={draft}
            dirty={dirty}
            busy={working}
            area={area}
            onAreaChange={setArea}
            onChange={setDraft}
            onSave={(andNext, value) => void save(andNext, value)}
            onDelete={() => void remove()}
            confirmCopy={() =>
              ask({
                title: "Ganti pemilik akhir?",
                message: `Isian pemilik akhir “${draft.pemilikAkhir}” akan diganti dengan “${draft.pemilikPertama}”.`,
                accept: "Ya, salin nama",
              })
            }
          />
        ) : (
          <section className="empty-card" aria-live="polite">
            <span className="empty-icon">
              {mode === "duplicates" ? (
                <Database size={26} />
              ) : (
                <FileSearch size={30} />
              )}
            </span>
            {mode === "loading" ? (
              <>
                <h2>Menyiapkan data demo…</h2>
                <p>Memuat inventaris desa {village.name}.</p>
              </>
            ) : mode === "duplicates" ? (
              <>
                <span className="eyebrow">PILIH DATA YANG SESUAI</span>
                <h2>
                  {duplicates.length} data dengan nomor hak {missingHak}
                </h2>
                <p>
                  Nomor hak ini muncul lebih dari satu kali di desa{" "}
                  {village.name}. Pilih baris berdasarkan nomor urut dan
                  pemilik.
                </p>
                <div className="duplicate-options">
                  {duplicates.map((row) => (
                    <button
                      className="duplicate-choice"
                      key={row.id}
                      onClick={() => openRow(row)}
                      disabled={working}
                    >
                      <span className="duplicate-number">NO {row.no}</span>
                      <span>
                        <strong>
                          {row.pemilikPertama || "Pemilik belum diisi"}
                        </strong>
                        <small>
                          {row.su || "SU belum diisi"} · NIB{" "}
                          {row.nib || "belum diisi"}
                        </small>
                      </span>
                      <ArrowRight size={17} />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <span className="eyebrow">NOMOR HAK {missingHak}</span>
                <h2>Belum ada data</h2>
                <p>
                  Nomor hak {missingHak} belum tersedia di desa {village.name}.
                  <br />
                  Tambahkan data baru saat Anda siap. Tidak ada baris yang
                  dibuat otomatis.
                </p>
                <button
                  className="button button-primary"
                  disabled={working}
                  onClick={() => void add(missingHak)}
                >
                  <Plus size={17} /> Tambah nomor hak {missingHak}
                </button>
              </>
            )}
          </section>
        )}
        <InventoryTable
          result={result}
          loading={listLoading}
          query={query}
          page={page}
          selectedId={draft?.id}
          onQuery={(value) => {
            setQuery(value);
            setPage(1);
          }}
          onPage={setPage}
          onOpen={async (row) => {
            if (row.id === draft?.id && !dirty) return;
            if (await canLeave()) {
              openRow(row);
              setSearchHak(row.hak);
              setNotice(null);
            }
          }}
          error={listError}
          onRetry={() => setRefresh((count) => count + 1)}
        />
        <footer className="site-footer">
          <span>
            <BookOpen size={14} /> ArsipTanah{" "}
            <span className="footer-divider">/</span> Inventaris yang lebih
            tertata.
          </span>
          <span>
            Prototipe v0.1 <i /> Seluruh data bersifat fiktif
          </span>
        </footer>
      </main>
      {confirmation && (
        <Dialog
          title={confirmation.title}
          danger={confirmation.danger}
          onClose={() => answer(false)}
          actions={
            <>
              <button
                className="button button-secondary"
                autoFocus
                onClick={() => answer(false)}
              >
                Batal
              </button>
              <button
                className={`button ${confirmation.danger ? "button-danger" : "button-primary"}`}
                onClick={() => answer(true)}
              >
                {confirmation.accept}
              </button>
            </>
          }
        >
          <p>{confirmation.message}</p>
        </Dialog>
      )}
      {helpOpen && (
        <Dialog
          title="Coba alur inventaris"
          onClose={() => setHelpOpen(false)}
          actions={
            <button
              className="button button-primary"
              onClick={() => setHelpOpen(false)}
            >
              Mulai mencoba <ArrowRight size={15} />
            </button>
          }
        >
          <ol className="help-steps">
            <li>
              <strong>1024 — Dokumen terisi</strong>
              <span>
                Edit isian dan buka data lanjutan untuk memeriksa pelestarian
                kolom pegawai.
              </span>
            </li>
            <li>
              <strong>1025 — Data parsial</strong>
              <span>
                SU 40 berbeda dari SU 040 pada nomor 1024. Isian lain boleh
                tetap kosong.
              </span>
            </li>
            <li>
              <strong>1026 — Belum tersedia</strong>
              <span>
                Simpan & Berikutnya dari 1025 membuka pilihan tambah tanpa
                membuat baris.
              </span>
            </li>
            <li>
              <strong>1027 — Nomor duplikat</strong>
              <span>
                Pilih baris yang sesuai. Setiap baris memiliki ID internal
                terpisah.
              </span>
            </li>
          </ol>
          <p className="help-warning">
            Hanya gunakan data fiktif. Perubahan bertahan saat halaman dimuat
            ulang, tetapi hanya di browser dan alamat aplikasi yang sama.
            Menghapus data situs juga menghapus perubahan demo.
          </p>
        </Dialog>
      )}
    </>
  );
}

function InfoIcon() {
  return (
    <span className="demo-icon">
      <Database size={18} />
    </span>
  );
}
