import {
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  FileText,
  Info,
  LockKeyhole,
  Save,
  Trash2,
} from "lucide-react";
import {
  EDITABLE_FIELDS,
  formatArea,
  joinNotes,
  NOTE_OPTIONS,
  normalizeSu,
  parseArea,
  parseNotes,
  suWithoutPrefix,
  type InventoryRow,
} from "../domain";
import { useEffect, useState, type KeyboardEvent } from "react";

interface Props {
  draft: InventoryRow;
  dirty: boolean;
  busy: boolean;
  area: string;
  onAreaChange: (value: string) => void;
  onChange: (row: InventoryRow) => void;
  onSave: (andNext: boolean, area: number | null) => void;
  onDelete: () => void;
  confirmCopy: () => Promise<boolean>;
}

export function RecordForm({
  draft,
  dirty,
  busy,
  area,
  onAreaChange,
  onChange,
  onSave,
  onDelete,
  confirmCopy,
}: Props) {
  const [areaError, setAreaError] = useState("");
  const [freeText, setFreeText] = useState(
    parseNotes(draft.keterangan).freeText,
  );
  useEffect(() => {
    setFreeText(parseNotes(draft.keterangan).freeText);
    setAreaError("");
  }, [draft.id, draft.revision]);
  const notes = parseNotes(draft.keterangan);
  const change = (
    field: (typeof EDITABLE_FIELDS)[number],
    value: string | number | null,
  ) => {
    onChange({ ...draft, [field]: value });
  };
  const save = (andNext: boolean) => {
    try {
      const parsed = parseArea(area);
      setAreaError("");
      onSave(andNext, parsed);
    } catch (error) {
      setAreaError((error as Error).message);
      document.getElementById("luas")?.focus();
    }
  };
  const keyboard = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter") return;
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      if (!busy) save(true);
    } else if (
      (event.target as HTMLElement).tagName !== "TEXTAREA" &&
      (event.target as HTMLElement).tagName !== "BUTTON"
    )
      event.preventDefault();
  };
  return (
    <form
      className="form-card"
      aria-label="Formulir inventaris"
      onSubmit={(event) => event.preventDefault()}
      onKeyDown={keyboard}
    >
      <div className="card-heading">
        <div className="heading-with-icon">
          <span className="section-icon">
            <FileText size={20} />
          </span>
          <div>
            <h2>{draft.id ? "Detail dokumen" : "Tambah dokumen"}</h2>
            <p>
              {draft.id
                ? `Nomor urut (NO) ${draft.no} · ${draft.desa}`
                : `Data baru · ${draft.desa}`}
            </p>
          </div>
        </div>
        <span className={`status-pill ${dirty ? "unsaved" : ""}`}>
          {dirty ? (
            <>
              <i /> Belum disimpan
            </>
          ) : draft.id ? (
            <>
              <Check size={13} /> Tersimpan
            </>
          ) : (
            "Draf baru"
          )}
        </span>
      </div>
      <fieldset disabled={busy}>
        <div className="form-section">
          <div className="section-label">
            <span>01</span>
            <h3>Identitas dokumen</h3>
            <span className="required-note">* wajib diisi</span>
          </div>
          <div className="field-grid">
            <label className="field" htmlFor="hak">
              <span>
                NO. HAK <b>*</b>
              </span>
              <input
                id="hak"
                name="hak"
                inputMode="numeric"
                autoComplete="off"
                value={draft.hak}
                onChange={(event) => change("hak", event.target.value)}
                placeholder="Contoh: 1024"
                aria-required="true"
                pattern="[0-9]+"
              />
            </label>
            <label className="field" htmlFor="su">
              <span>NO.SU</span>
              <div className="input-adornment">
                <span>SU</span>
                <input
                  id="su"
                  name="su"
                  value={suWithoutPrefix(draft.su)}
                  onChange={(event) =>
                    change("su", normalizeSu(event.target.value))
                  }
                  autoComplete="off"
                  placeholder="040"
                />
              </div>
            </label>
            <label className="field" htmlFor="tahun">
              <span>TAHUN SU</span>
              <input
                id="tahun"
                name="tahunSu"
                inputMode="numeric"
                value={draft.tahunSu}
                onChange={(event) => change("tahunSu", event.target.value)}
                placeholder="Contoh: 2020"
                maxLength={4}
              />
            </label>
            <label className="field" htmlFor="nib">
              <span>NIB</span>
              <input
                id="nib"
                name="nib"
                value={draft.nib}
                onChange={(event) => change("nib", event.target.value)}
                placeholder="Sesuai dokumen"
                autoComplete="off"
              />
            </label>
            <label className="field" htmlFor="luas">
              <span>LUAS</span>
              <div
                className={`input-adornment suffix ${areaError ? "invalid" : ""}`}
              >
                <input
                  id="luas"
                  name="luas"
                  inputMode="decimal"
                  value={area}
                  onChange={(event) => {
                    onAreaChange(event.target.value);
                    setAreaError("");
                  }}
                  placeholder="Contoh: 1250,5"
                  aria-invalid={!!areaError}
                  aria-describedby="luas-help"
                />
                <span>m²</span>
              </div>
              <small id="luas-help" className={areaError ? "field-error" : ""}>
                {areaError ||
                  (area && !Number.isNaN(Number(area.replace(",", ".")))
                    ? formatArea(Number(area.replace(",", ".")))
                    : "Tanpa titik ribuan; koma untuk desimal")}
              </small>
            </label>
            <label className="field" htmlFor="lembar">
              <span>LEMBAR</span>
              <input
                id="lembar"
                name="lembar"
                value={draft.lembar}
                onChange={(event) => change("lembar", event.target.value)}
                placeholder="Contoh: 08-2"
              />
            </label>
            <label className="field" htmlFor="kotak">
              <span>KOTAK</span>
              <input
                id="kotak"
                name="kotak"
                value={draft.kotak}
                onChange={(event) => change("kotak", event.target.value)}
                placeholder="Contoh: E-5"
              />
            </label>
            <div className="auto-field">
              <LockKeyhole size={14} />
              <span>
                Lokasi mengikuti desa
                <small>
                  {draft.kecamatan} / {draft.desa}
                </small>
              </span>
            </div>
          </div>
        </div>
        <div className="form-section">
          <div className="section-label">
            <span>02</span>
            <h3>Informasi pemilik</h3>
          </div>
          <div className="owner-grid">
            <label className="field" htmlFor="pertama">
              <span>PEMILIK PERTAMA</span>
              <input
                id="pertama"
                name="pemilikPertama"
                value={draft.pemilikPertama}
                onChange={(event) =>
                  change("pemilikPertama", event.target.value)
                }
                placeholder="Nama sesuai dokumen"
                autoComplete="off"
              />
            </label>
            <div className="field owner-last">
              <div className="field-label-row">
                <label htmlFor="akhir">PEMILIK AKHIR</label>
                <button
                  type="button"
                  className="text-button"
                  disabled={!draft.pemilikPertama}
                  onClick={async () => {
                    if (
                      draft.pemilikAkhir &&
                      draft.pemilikAkhir !== draft.pemilikPertama &&
                      !(await confirmCopy())
                    )
                      return;
                    change("pemilikAkhir", draft.pemilikPertama);
                  }}
                >
                  <Copy size={12} /> Salin pemilik pertama
                </button>
              </div>
              <input
                id="akhir"
                name="pemilikAkhir"
                value={draft.pemilikAkhir}
                onChange={(event) => change("pemilikAkhir", event.target.value)}
                placeholder="Isi jika sudah diketahui"
                autoComplete="off"
              />
            </div>
          </div>
        </div>
        <div className="form-section notes-section">
          <div className="section-label">
            <span>03</span>
            <h3>Keterangan</h3>
            <span className="required-note">Boleh pilih lebih dari satu</span>
          </div>
          <div
            className="note-options"
            role="group"
            aria-label="Pilihan keterangan"
          >
            {NOTE_OPTIONS.map((option) => (
              <button
                type="button"
                key={option}
                aria-pressed={notes.selected.includes(option)}
                className={`note-chip ${notes.selected.includes(option) ? "selected" : ""}`}
                onClick={() => {
                  const selected = notes.selected.includes(option)
                    ? notes.selected.filter((item) => item !== option)
                    : [...notes.selected, option];
                  change("keterangan", joinNotes(selected, freeText));
                }}
              >
                {notes.selected.includes(option) && <Check size={12} />}
                {option}
              </button>
            ))}
          </div>
          <label className="sr-only" htmlFor="keterangan">
            Keterangan tambahan
          </label>
          <textarea
            id="keterangan"
            name="keterangan"
            rows={2}
            value={freeText}
            placeholder="Tambahkan keterangan lain jika diperlukan…"
            onChange={(event) => {
              setFreeText(event.target.value);
              change(
                "keterangan",
                joinNotes(notes.selected, event.target.value),
              );
            }}
          />
          <p className="field-help">
            Disimpan sebagai satu teks
            {notes.selected.length
              ? ` · ${draft.keterangan}`
              : ". Kolom kosong boleh dilengkapi nanti."}
          </p>
        </div>
        <details className="advanced">
          <summary>
            <span>
              <LockKeyhole size={15} /> Data lanjutan pegawai{" "}
              <span className="readonly-badge">Hanya baca</span>
            </span>
            <ChevronDown size={16} />
          </summary>
          <div className="advanced-content">
            <p>Nilai ini tetap dipertahankan saat Anda menyimpan kolom lain.</p>
            <div className="advanced-grid">
              {[
                ["KUPT", draft.kupt],
                ["CEK", draft.cek],
                ["KAPLING", draft.kapling],
                ["STATUS FISIK", draft.statusFisik],
                ["KW", draft.kw],
              ].map(([label, value]) => (
                <label className="field" key={label}>
                  <span>{label}</span>
                  <input readOnly value={value} placeholder="Belum diisi" />
                </label>
              ))}
            </div>
          </div>
        </details>
      </fieldset>
      <div className="form-footer">
        <span className="footer-info">
          <Info size={14} /> Data belum lengkap tetap bisa disimpan.
        </span>
        <div className="form-actions">
          {draft.id && (
            <button
              type="button"
              className="button button-danger-ghost"
              disabled={busy}
              onClick={onDelete}
            >
              <Trash2 size={15} />
              <span>Hapus</span>
            </button>
          )}
          <button
            type="button"
            className="button button-secondary"
            disabled={busy}
            onClick={() => save(false)}
          >
            <Save size={15} /> Simpan
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={busy}
            onClick={() => save(true)}
          >
            {busy ? "Menyimpan…" : "Simpan & Berikutnya"}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
      <div className="keyboard-hint">
        <kbd>Ctrl</kbd> + <kbd>Enter</kbd>
        <span>untuk simpan & berikutnya</span>
      </div>
    </form>
  );
}
