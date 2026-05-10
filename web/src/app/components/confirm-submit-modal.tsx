"use client";

import { useId, useRef } from "react";

type ConfirmSubmitModalProps = {
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  triggerClassName?: string;
  confirmClassName?: string;
  children?: React.ReactNode;
};

export function ConfirmSubmitModal({
  triggerLabel,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  triggerClassName,
  confirmClassName,
  children,
}: ConfirmSubmitModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <>
      <button
        className={triggerClassName}
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        {triggerLabel}
      </button>
      <dialog
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        className="modal-shell"
        ref={dialogRef}
      >
        <div className="modal-card modal-card-compact">
          <div className="modal-header">
            <div>
              <h2 className="modal-title" id={titleId}>
                {title}
              </h2>
              <p className="muted modal-description" id={descriptionId}>
                {description}
              </p>
            </div>
          </div>

          {children ? <div className="modal-content">{children}</div> : null}

          <div className="modal-actions">
            <button
              className="button button-secondary"
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              {cancelLabel}
            </button>
            <button className={confirmClassName} type="submit">
              {confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
