import type { InventoryRow } from "./domain";

export const SEQUENCE_FIELDS = ["su", "nib"] as const;
export type SequenceField = (typeof SEQUENCE_FIELDS)[number];
export const SEQUENCE_LABELS = { su: "nomor SU", nib: "NIB" } as const;

export interface FieldSequence {
  enabled: boolean;
  message: string;
  suggested?: string;
}
export type SequenceState = Record<SequenceField, FieldSequence>;
export type SequenceValues = Partial<Pick<InventoryRow, SequenceField>>;
export interface SequencePlan {
  state: SequenceState;
  values: SequenceValues;
}

export function emptySequences(): SequenceState {
  return {
    su: { enabled: false, message: "" },
    nib: { enabled: false, message: "" },
  };
}

export function nextSequenceValue(field: SequenceField, value: string): string {
  if (field === "su") {
    const match = /^SU (\d+)$/.exec(value);
    if (!match)
      throw new Error(
        "Isi nomor SU secara manual dengan angka saja, misalnya SU 040, lalu aktifkan lagi.",
      );
    return `SU ${(BigInt(match[1]) + 1n).toString().padStart(match[1].length, "0")}`;
  }

  // Format yang dikenali: angka, atau segmen angka yang dipisahkan titik.
  // Jangan trim atau normalisasi NIB: seluruh awalan harus tetap persis sama.
  const match = /^((?:\d+\.)*)(\d+)$/.exec(value);
  if (!match)
    throw new Error(
      "Isi NIB secara manual dengan angka atau kelompok angka dipisahkan titik, misalnya 31.05.04.07.00009, lalu aktifkan lagi.",
    );
  const next = (BigInt(match[2]) + 1n).toString();
  if (next.length > match[2].length) {
    throw new Error(
      "Penambahan NIB melebihi lebar bagian angka terakhir. Isi NIB secara manual; awalan dan lebarnya tidak diubah otomatis.",
    );
  }
  return `${match[1]}${next.padStart(match[2].length, "0")}`;
}

export function toggleSequence(
  state: FieldSequence,
  field: SequenceField,
  value: string,
): FieldSequence {
  if (state.enabled) return { ...state, enabled: false, message: "" };
  try {
    nextSequenceValue(field, value);
    return { ...state, enabled: true, message: "" };
  } catch (error) {
    return { ...state, enabled: false, message: (error as Error).message };
  }
}

// Hanya dipanggil untuk perpindahan setelah Simpan & Berikutnya berhasil.
// Acuan berasal dari hasil simpan, bukan saran yang belum disimpan.
export function prepareSequence(
  state: SequenceState,
  saved: Pick<InventoryRow, SequenceField>,
): SequencePlan {
  const nextState = emptySequences();
  const values: SequenceValues = {};
  for (const field of SEQUENCE_FIELDS) {
    nextState[field] = { ...state[field], suggested: undefined };
    if (!state[field].enabled) continue;
    try {
      values[field] = nextSequenceValue(field, saved[field]);
      nextState[field].message = "";
    } catch (error) {
      nextState[field] = {
        enabled: false,
        message: `Urutan dihentikan. ${(error as Error).message}`,
      };
    }
  }
  return { state: nextState, values };
}

// Tidak memutasi baris tujuan atau menulis penyimpanan. Nilai yang sudah terisi,
// termasuk whitespace, menghentikan hanya urutan kolom yang bersangkutan.
export function applySequence(
  plan: SequencePlan,
  target: Pick<InventoryRow, SequenceField>,
): SequencePlan {
  const state = emptySequences();
  const values: SequenceValues = {};
  for (const field of SEQUENCE_FIELDS) {
    state[field] = { ...plan.state[field] };
    const suggestion = plan.values[field];
    if (!state[field].enabled || suggestion === undefined) continue;
    if (target[field] !== "") {
      state[field] = {
        enabled: false,
        message: `Urutan dihentikan: ${SEQUENCE_LABELS[field]} pada baris tujuan sudah terisi (${target[field]}). Nilai yang ada dipertahankan. Aktifkan lagi untuk melanjutkan.`,
      };
    } else {
      values[field] = suggestion;
      state[field].suggested = suggestion;
    }
  }
  return { state, values };
}
