// @vitest-environment node
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { newCertificateCode, newCertificateTxRef } from "./billing";
import { renderCertificatePdf } from "./certificate-pdf";
import { certificateCost } from "./certificates";

describe("certificateCost", () => {
  it("is free when no price is set", () => {
    expect(certificateCost({ certificate_price_usd: null, certificate_price_ngn: null }, "USD")).toEqual({ free: true });
    expect(certificateCost({ certificate_price_usd: "0", certificate_price_ngn: 0 }, "NGN")).toEqual({ free: true });
  });

  it("charges the visitor's currency", () => {
    const course = { certificate_price_usd: "10.00", certificate_price_ngn: "15000.00" };
    expect(certificateCost(course, "USD")).toEqual({ free: false, amount: 10 });
    expect(certificateCost(course, "NGN")).toEqual({ free: false, amount: 15000 });
  });

  it("isn't free just because one currency has no price", () => {
    expect(certificateCost({ certificate_price_usd: 10, certificate_price_ngn: null }, "NGN")).toEqual({ unavailable: true });
  });
});

describe("certificate codes", () => {
  it("avoid characters that are easily confused", () => {
    for (let i = 0; i < 50; i++) expect(newCertificateCode()).toMatch(/^CI-[2-9A-HJ-NP-Z]{10}$/);
  });

  it("are charged under their own reference", () => {
    expect(newCertificateTxRef()).toMatch(/^cert_/);
  });
});

describe("renderCertificatePdf", () => {
  const base = { courseTitle: "Junior Web Creator", issuedAt: "2026-11-09T10:00:00Z", code: "CI-ABC", verifyUrl: "https://x.test/certificates/CI-ABC" };

  it("makes a one-page landscape document", async () => {
    const pdf = await PDFDocument.load(await renderCertificatePdf({ ...base, name: "Ada Obi" }));
    expect(pdf.getPageCount()).toBe(1);
    const { width, height } = pdf.getPage(0).getSize();
    expect(width).toBeGreaterThan(height);
  });

  it("prints names with Nigerian letters and very long names", async () => {
    await expect(renderCertificatePdf({ ...base, name: "Ọláwùmí Adéyẹmí-Ńwáńkwọ́" })).resolves.toBeInstanceOf(Uint8Array);
    await expect(renderCertificatePdf({ ...base, name: "A very long name ".repeat(12) })).resolves.toBeInstanceOf(Uint8Array);
  });
});
