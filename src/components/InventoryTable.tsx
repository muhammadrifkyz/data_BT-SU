import {
  ArrowDown,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Search,
  Table2,
} from "lucide-react";
import { formatArea, type InventoryRow } from "../domain";
import type { PageResult } from "../services/inventory";

interface Props {
  result: PageResult;
  loading: boolean;
  query: string;
  page: number;
  selectedId?: string;
  onQuery: (value: string) => void;
  onPage: (page: number) => void;
  onOpen: (row: InventoryRow) => void;
  onRetry: () => void;
  error: string;
}

export const PAGE_SIZE = 8;

export function InventoryTable({
  result,
  loading,
  query,
  page,
  selectedId,
  onQuery,
  onPage,
  onOpen,
  error,
  onRetry,
}: Props) {
  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  return (
    <section className="table-card" aria-labelledby="table-title">
      <div className="table-heading">
        <div className="heading-with-icon">
          <span className="section-icon plain">
            <Table2 size={19} />
          </span>
          <h2 id="table-title">Daftar inventaris</h2>
          <span className="count-badge">{result.total} data</span>
        </div>
        <div className="table-search">
          <Search size={16} />
          <input
            aria-label="Cari dalam tabel"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Cari hak, SU, NIB, atau pemilik…"
          />
        </div>
      </div>
      <div className="table-scroll" aria-busy={loading}>
        <table>
          <thead>
            <tr>
              <th scope="col">NO</th>
              <th scope="col">
                NO. HAK <ArrowDown size={12} />
              </th>
              <th scope="col">NO.SU</th>
              <th scope="col">NIB</th>
              <th scope="col">PEMILIK PERTAMA</th>
              <th scope="col">PEMILIK AKHIR</th>
              <th scope="col" className="numeric">
                LUAS
              </th>
              <th scope="col">
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td colSpan={8} className="table-empty">
                  <p role="alert">{error}</p>
                  <button className="text-button" onClick={onRetry}>
                    Coba lagi
                  </button>
                </td>
              </tr>
            ) : !result.rows.length ? (
              <tr>
                <td colSpan={8} className="table-empty">
                  {loading
                    ? "Memuat data…"
                    : query
                      ? "Tidak ada data yang cocok dengan pencarian."
                      : "Belum ada data untuk desa ini."}
                </td>
              </tr>
            ) : (
              result.rows.map((row) => (
                <tr
                  key={row.id}
                  className={row.id === selectedId ? "active-row" : ""}
                >
                  <td className="muted">{row.no}</td>
                  <td>
                    <button
                      className="hak-link"
                      onClick={() => onOpen(row)}
                      aria-label={`Buka nomor hak ${row.hak}, nomor urut ${row.no}`}
                    >
                      {row.hak}
                    </button>
                  </td>
                  <td className="nowrap">
                    {row.su || <span className="empty-dash">—</span>}
                  </td>
                  <td className="mono nowrap">
                    {row.nib || <span className="empty-dash">—</span>}
                  </td>
                  <td>
                    {row.pemilikPertama || (
                      <span className="empty-dash">—</span>
                    )}
                  </td>
                  <td>
                    {row.pemilikAkhir || <span className="empty-dash">—</span>}
                  </td>
                  <td className="numeric nowrap">{formatArea(row.luas)}</td>
                  <td>
                    <button
                      className="row-open"
                      aria-label={`Edit nomor urut ${row.no}`}
                      onClick={() => onOpen(row)}
                    >
                      <ArrowUpRight size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <p>
          {result.total
            ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, result.total)} dari ${result.total} data`
            : "0 data"}
          <span>
            {" "}
            · {loading ? "Memperbarui…" : "Tersimpan di browser ini"}
          </span>
        </p>
        <div className="pagination">
          <button
            aria-label="Halaman sebelumnya"
            disabled={page <= 1 || loading}
            onClick={() => onPage(page - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            Halaman <strong>{page}</strong> dari {pages}
          </span>
          <button
            aria-label="Halaman berikutnya"
            disabled={page >= pages || loading}
            onClick={() => onPage(page + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
