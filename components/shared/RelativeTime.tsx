"use client";

import React, { useSyncExternalStore } from "react";
import { formatRelativeTime } from "@/lib/format";

const emptySubscribe = () => () => {};

interface RelativeTimeProps {
  date: string | Date;
  className?: string;
  prefix?: string;
}

export function RelativeTime({ date, className, prefix = "" }: RelativeTimeProps) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isClient) {
    return <span className={className}>...</span>;
  }

  return (
    <span className={className}>
      {prefix}
      {formatRelativeTime(date)}
    </span>
  );
}
