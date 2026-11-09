import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import logo from "../public/code-ill.svg";

type Tone = "light" | "dark";

interface BrandLogoProps {
  /** Where the logo links to; omit for no link. */
  href?: string;
  /** Badge size in pixels. */
  size?: number;
  /** Small line under the name, e.g. "Online School" or "Learner dashboard". */
  subtitle?: string;
  /** "dark" for dark backgrounds (dashboard, admin, account pages). */
  tone?: Tone;
  /** Hide the name and subtitle, showing only the badge. */
  badgeOnly?: boolean;
  className?: string;
  priority?: boolean;
}

/**
 * The Code Illustrated badge (public/code-ill.svg) with the school's name next
 * to it. The badge's own lettering is too small to read below ~48px, so the
 * name is always set beside it unless `badgeOnly` is given.
 */
export function BrandLogo({
  href,
  size = 40,
  subtitle = "Online School",
  tone = "dark",
  badgeOnly = false,
  className,
  priority = false,
}: BrandLogoProps) {
  const content = (
    <>
      <Image
        src={logo}
        alt={badgeOnly ? "Code Illustrated Online School" : ""}
        width={size}
        height={size}
        priority={priority}
        className="shrink-0 drop-shadow-[0_2px_8px_rgba(195,29,36,0.25)] transition-transform duration-200 group-hover:scale-105"
        style={{ width: size, height: size }}
      />
      {!badgeOnly && (
        <span className="min-w-0 text-left leading-tight">
          <span
            className={cn(
              "block truncate font-bold tracking-tight",
              size >= 48 ? "text-lg" : "text-[15px]",
              tone === "dark" ? "text-white" : "text-foreground"
            )}
          >
            Code Illustrated
          </span>
          {subtitle && (
            <span
              className={cn(
                "block truncate text-[11px] font-medium uppercase tracking-[0.12em]",
                tone === "dark" ? "text-[#ffbd59]/80" : "text-primary-600"
              )}
            >
              {subtitle}
            </span>
          )}
        </span>
      )}
    </>
  );

  const classes = cn("group inline-flex items-center gap-3", className);
  return href ? (
    <Link href={href} className={classes} aria-label={badgeOnly ? "Code Illustrated home" : undefined}>
      {content}
    </Link>
  ) : (
    <span className={classes}>{content}</span>
  );
}
