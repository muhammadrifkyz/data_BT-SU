import { ListOrdered } from "lucide-react";
import {
  SEQUENCE_LABELS,
  type FieldSequence,
  type SequenceField,
} from "../sequencing";

interface Props {
  field: SequenceField;
  state: FieldSequence;
  disabled: boolean;
  onToggle: (field: SequenceField) => void;
}

export function SequenceControl({ field, state, disabled, onToggle }: Props) {
  return (
    <div className="sequence-control">
      <button
        type="button"
        className={`sequence-toggle ${state.enabled ? "enabled" : ""}`}
        aria-label={`Urutkan otomatis ${SEQUENCE_LABELS[field]}`}
        aria-pressed={state.enabled}
        aria-describedby={`sequence-${field}-help`}
        disabled={disabled}
        onClick={() => onToggle(field)}
      >
        <ListOrdered size={13} /> Urutkan otomatis{" "}
        <span>{state.enabled ? "Aktif" : "Nonaktif"}</span>
      </button>
      <div
        id={`sequence-${field}-help`}
        className="sequence-help"
        aria-live="polite"
      >
        {state.suggested !== undefined && (
          <span className="suggestion-badge">Saran — belum disimpan</span>
        )}
        {state.message ? (
          <p className="sequence-warning">{state.message}</p>
        ) : state.enabled ? (
          <p>+1 setelah Simpan & Berikutnya. Klik lagi untuk mematikan.</p>
        ) : null}
      </div>
    </div>
  );
}
