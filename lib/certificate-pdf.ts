import { readFile } from "fs/promises";
import path from "path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

// A one-page landscape A4 certificate. Fonts are embedded because the standard
// PDF fonts can't print many names, such as those with Yoruba or Igbo letters.
// next.config.js keeps lib/fonts in the deployed route.

const fontPath = (file: string) => path.join(process.cwd(), "lib/fonts", file);
const INK = rgb(0.09, 0.11, 0.17);
const MUTED = rgb(0.42, 0.45, 0.5);
const RED = rgb(0.76, 0.11, 0.14);

function centred(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color = INK, maxWidth = 680) {
  let fitted = size;
  while (font.widthOfTextAtSize(text, fitted) > maxWidth && fitted > 10) fitted -= 1;
  page.drawText(text, { x: (page.getWidth() - font.widthOfTextAtSize(text, fitted)) / 2, y, size: fitted, font, color });
}

export async function renderCertificatePdf(input: {
  name: string;
  courseTitle: string;
  issuedAt: string;
  code: string;
  verifyUrl: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await Promise.all([readFile(fontPath("DejaVuSans.ttf")), readFile(fontPath("DejaVuSans-Bold.ttf"))]);
  const regular = await pdf.embedFont(regularBytes, { subset: true });
  const bold = await pdf.embedFont(boldBytes, { subset: true });

  pdf.setTitle(`Certificate: ${input.courseTitle}`);
  pdf.setAuthor("Code Illustrated");

  const page = pdf.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 24, y: 24, width: width - 48, height: height - 48, borderColor: RED, borderWidth: 3 });
  page.drawRectangle({ x: 34, y: 34, width: width - 68, height: height - 68, borderColor: rgb(0.85, 0.85, 0.88), borderWidth: 1 });

  const issued = new Date(input.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  centred(page, "Code Illustrated Online School", 505, bold, 16, RED);
  centred(page, "Certificate of Completion", 445, bold, 36);
  centred(page, "This certifies that", 385, regular, 14, MUTED);
  centred(page, input.name, 335, bold, 32);
  centred(page, "has successfully completed", 290, regular, 14, MUTED);
  centred(page, input.courseTitle, 245, bold, 24, RED);
  centred(page, `Awarded on ${issued}`, 195, regular, 13, MUTED);
  centred(page, `Certificate ${input.code}`, 95, bold, 11);
  centred(page, `Verify at ${input.verifyUrl}`, 75, regular, 10, MUTED);

  return pdf.save();
}
