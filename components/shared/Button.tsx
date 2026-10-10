"use client";

import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "link";
  size?: "sm" | "md" | "lg" | "xl";
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    isLoading = false,
    loadingText,
    leftIcon,
    rightIcon,
    className = "",
    children,
    disabled,
    ...props
  },
  ref
) {
  const variantStyles = {
    primary:
      "bg-lavender-600 hover:bg-lavender-700 active:bg-lavender-800 text-white shadow-xs focus-visible:ring-4 focus-visible:ring-lavender-300/40 border border-transparent",
    secondary:
      "bg-white hover:bg-neutral-50 active:bg-neutral-100 text-neutral-800 border border-neutral-200 shadow-xs focus-visible:ring-4 focus-visible:ring-lavender-300/30",
    ghost:
      "bg-transparent hover:bg-neutral-100 active:bg-neutral-200 text-neutral-700 border border-transparent focus-visible:ring-4 focus-visible:ring-lavender-300/20",
    destructive:
      "bg-danger-600 hover:bg-danger-700 active:bg-danger-800 text-white shadow-xs focus-visible:ring-4 focus-visible:ring-danger-300/30 border border-transparent",
    link:
      "bg-transparent text-lavender-600 hover:text-lavender-700 hover:underline active:text-lavender-800 p-0 h-auto border-none shadow-none",
  }[variant];

  const sizeStyles = {
    sm: "h-8 px-3 text-xs rounded-xl gap-1.5 font-semibold",
    md: "h-10 px-4 text-xs sm:text-sm rounded-xl gap-2 font-semibold",
    lg: "h-12 px-5 text-sm sm:text-base rounded-xl gap-2 font-semibold",
    xl: "h-14 px-6 text-base rounded-xl gap-2.5 font-semibold",
  }[size];

  const isDisabled = disabled || isLoading;

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center select-none outline-none transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin -ml-0.5 h-4 w-4 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{loadingText || children || "Memproses..."}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});
