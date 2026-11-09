import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      {children}
    </div>
  );
}
