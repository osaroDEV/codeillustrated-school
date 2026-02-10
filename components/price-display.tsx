import { cn } from "@/lib/utils";

interface PriceValue {
  usd: number;
  ngn: number;
}

interface PriceDisplayProps {
  price: PriceValue | string | number;
  className?: string;
  showCurrency?: boolean;
}

export function PriceDisplay({
  price,
  className,
  showCurrency = true,
}: PriceDisplayProps) {
  let formattedPrice: string;

  if (typeof price === "object" && price !== null && "usd" in price) {
    // Default to USD for now, or handle currency selection if context existed
    formattedPrice = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price.usd);
  } else if (typeof price === "number") {
    formattedPrice = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  } else {
    formattedPrice = String(price);
  }

  return <span className={cn("font-bold", className)}>{formattedPrice}</span>;
}
