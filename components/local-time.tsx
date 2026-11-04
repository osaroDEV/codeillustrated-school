"use client";

import { useEffect, useState } from "react";

const DEFAULT_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
};

/**
 * A timestamp in the viewer's own time zone. Server components render in the
 * server's zone (UTC on Vercel), so the server pass shows UTC and the browser
 * replaces it after hydration.
 */
export function LocalTime({
  iso,
  format = DEFAULT_FORMAT,
  className,
}: {
  iso: string;
  format?: Intl.DateTimeFormatOptions;
  className?: string;
}) {
  const [text, setText] = useState(() =>
    new Date(iso).toLocaleString("en-GB", { ...format, timeZone: "UTC", timeZoneName: "short" })
  );

  useEffect(() => {
    setText(new Date(iso).toLocaleString("en-GB", format));
    // format is a constant object in practice; re-run only when the time changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso]);

  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {text}
    </time>
  );
}
