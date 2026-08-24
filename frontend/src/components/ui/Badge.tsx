import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'purple' | 'outline';
  size?: 'sm' | 'md';
}

export function Badge({ className, variant = 'default', size = 'sm', children, ...props }: BadgeProps) {
  const baseStyles = "inline-flex items-center font-medium rounded-full tracking-wide";
  
  const variants = {
    default: "bg-[#f1f5f9] text-[#334155] border border-[#e2e8f0]",
    success: "bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]",
    warning: "bg-[#fffbeb] text-[#d97706] border border-[#fde68a]",
    destructive: "bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]",
    info: "bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]",
    purple: "bg-[#faf5ff] text-[#9333ea] border border-[#e9d5ff]",
    outline: "border border-[#cbd5e1] text-[#475569] bg-transparent",
  };

  const sizes = {
    sm: "text-[11px] px-2.5 py-0.5",
    md: "text-xs px-3 py-1",
  };

  return (
    <span className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))} {...props}>
      {children}
    </span>
  );
}
