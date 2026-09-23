import { NextResponse } from "next/server";
import puppeteer from "puppeteer";

export async function POST(req: Request) {
  try {
    const { html } = await req.json();

    if (!html) {
      return NextResponse.json({ error: "Missing HTML content" }, { status: 400 });
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    
    // We set the content of the page
    await page.setContent(html, { waitUntil: "load" });

    // Generate PDF in landscape as required
    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: {
        top: "8mm",
        right: "8mm",
        bottom: "8mm",
        left: "8mm",
      },
    });

    await browser.close();

    return new Response(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="informe.pdf"',
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
