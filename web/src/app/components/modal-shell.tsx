"use client";

import { useId, useRef } from "react";

type ModalShellProps = {
  triggerLabel: string;
  title: string;
  description?: string;
  triggerClassName?: string;
  children: React.ReactNode;
};

export function ModalShell({
  triggerLabel,
  title,
  description,
  triggerClassName,
  children,
}: ModalShellProps) {
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
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        className="modal-shell"
        ref={dialogRef}
      >
        <div className="modal-card">
          <div className="modal-header">
            <div>
              <h2 className="modal-title" id={titleId}>
                {title}
              </h2>
              {description ? (
                <p className="muted modal-description" id={descriptionId}>
                  {description}
                </p>
              ) : null}
            </div>
            <button
              aria-label="Close dialog"
              className="modal-close"
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              ×
            </button>
          </div>

          <div className="modal-content">{children}</div>
        </div>
      </dialog>
    </>
  );
}
