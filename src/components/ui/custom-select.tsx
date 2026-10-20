"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: (SelectOption | string)[];
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  direction?: "down" | "up";
};

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className,
  id,
  disabled = false,
  size = "md",
  direction = "down",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedOptions: SelectOption[] = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt,
  );

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const currentIndex = normalizedOptions.findIndex((o) => o.value === value);
      const nextIndex = (currentIndex + 1) % normalizedOptions.length;
      if (normalizedOptions[nextIndex]) {
        onChange(normalizedOptions[nextIndex].value);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const currentIndex = normalizedOptions.findIndex((o) => o.value === value);
      const prevIndex =
        currentIndex <= 0 ? normalizedOptions.length - 1 : currentIndex - 1;
      if (normalizedOptions[prevIndex]) {
        onChange(normalizedOptions[prevIndex].value);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative inline-block w-full text-left", className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border bg-white text-left font-medium outline-none transition dark:bg-umber-950",
          size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm",
          isOpen
            ? "border-bronze-500 ring-2 ring-bronze-500/20"
            : "border-umber-300 hover:border-umber-400 dark:border-umber-700 dark:hover:border-umber-600",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {selectedOption?.icon && (
            <span className="shrink-0 text-umber-500">{selectedOption.icon}</span>
          )}
          <span
            className={cn(
              "truncate",
              selectedOption
                ? "text-umber-900 dark:text-umber-100"
                : "text-umber-400 dark:text-umber-500",
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "shrink-0 text-umber-400 transition-transform duration-200",
            size === "sm" ? "size-3.5" : "size-4",
            isOpen && "rotate-180 text-bronze-600 dark:text-bronze-400",
          )}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className={cn(
            "absolute z-50 max-h-60 w-full overflow-y-auto rounded-xl border border-umber-200/90 bg-white/95 p-1 shadow-xl shadow-umber-950/20 backdrop-blur-md dark:border-umber-700/80 dark:bg-umber-950/95 dark:shadow-black/60",
            direction === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5",
          )}
        >
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "group flex w-full items-center justify-between gap-2 rounded-lg text-left font-medium transition-colors",
                  size === "sm" ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-sm",
                  isSelected
                    ? "bg-bronze-50 text-bronze-900 dark:bg-bronze-950/60 dark:text-bronze-200 font-semibold"
                    : "text-umber-800 hover:bg-umber-100/70 dark:text-umber-200 dark:hover:bg-umber-900/60",
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {opt.icon && (
                    <span
                      className={cn(
                        "shrink-0",
                        isSelected
                          ? "text-bronze-600 dark:text-bronze-400"
                          : "text-umber-400 group-hover:text-umber-600 dark:text-umber-500",
                      )}
                    >
                      {opt.icon}
                    </span>
                  )}
                  <span className="truncate">{opt.label}</span>
                </div>
                {isSelected && (
                  <Check className="size-3.5 shrink-0 text-bronze-600 dark:text-bronze-400" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
