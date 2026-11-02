"use client";

import { MoreHorizontal } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

export type MoreMenuItem =
  | { label: string; onSelect: () => void; danger?: boolean; disabled?: boolean }
  | { label: string; href: string; external?: boolean }
  | { label: string; render: (close: () => void) => ReactNode };

/** Three-dot menu for secondary card actions. Closes on outside click, Escape, or after an action. */
export function MoreMenu({ items, label = "More actions" }: { items: MoreMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="more-menu" ref={ref}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className="icon-button"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <MoreHorizontal size={16} />
      </button>
      {open ? (
        <div className="more-menu-panel" id={menuId} role="menu">
          {items.map((item) => {
            if ("render" in item) {
              return (
                <div className="more-menu-custom" key={item.label}>
                  {item.render(close)}
                </div>
              );
            }
            if ("href" in item) {
              return (
                <a className="more-menu-item" href={item.href} key={item.label} onClick={close} rel={item.external ? "noreferrer" : undefined} role="menuitem" target={item.external ? "_blank" : undefined}>
                  {item.label}
                </a>
              );
            }
            return (
              <button
                className={`more-menu-item ${item.danger ? "danger" : ""}`}
                disabled={item.disabled}
                key={item.label}
                onClick={() => {
                  close();
                  item.onSelect();
                }}
                role="menuitem"
                type="button"
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
