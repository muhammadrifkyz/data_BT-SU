import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface DialogProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  actions: ReactNode;
  danger?: boolean;
}

export function Dialog({
  title,
  children,
  onClose,
  actions,
  danger,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-heading">
        <span className={`dialog-icon ${danger ? "danger" : ""}`}>
          {danger ? "!" : "?"}
        </span>
        <button
          className="icon-button"
          aria-label="Tutup dialog"
          onClick={onClose}
        >
          <X size={19} />
        </button>
      </div>
      <h2 id="dialog-title">{title}</h2>
      <div className="dialog-content">{children}</div>
      <div className="dialog-actions">{actions}</div>
    </dialog>
  );
}
