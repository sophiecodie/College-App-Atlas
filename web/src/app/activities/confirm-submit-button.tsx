"use client";

type ConfirmSubmitButtonProps = {
  className?: string;
  children: React.ReactNode;
  confirmMessage: string;
};

export function ConfirmSubmitButton({
  className,
  children,
  confirmMessage,
}: ConfirmSubmitButtonProps) {
  return (
    <button
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      {children}
    </button>
  );
}
