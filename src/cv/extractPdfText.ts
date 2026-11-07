import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type PdfTextResult = {
  fileName: string;
  pageCount: number;
  text: string;
  links: string[];
};

export async function extractPdfText(file: File): Promise<PdfTextResult> {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    throw new Error("Please select a PDF file.");
  }

  const document = await getDocument({ data: await file.arrayBuffer() }).promise;
  const pageCount = document.numPages;
  const pageTexts: string[] = [];
  const links: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const annotations = await page.getAnnotations({ intent: "display" });
      for (const annotation of annotations) {
        if (annotation.subtype === "Link" && annotation.url?.startsWith("http")) {
          links.push(annotation.url);
        }
      }
      const pageText = content.items
        .map((item) => {
          if (!("str" in item)) {
            return "";
          }

          return `${item.str}${"hasEOL" in item && item.hasEOL ? "\n" : " "}`;
        })
        .join("")
        .replace(/[ \t]+/g, " ")
        .replace(/ *\n */g, "\n")
        .trim();

      pageTexts.push(pageText);
    }
  } finally {
    await document.cleanup();
  }

  const text = pageTexts.filter(Boolean).join("\n\n").trim();
  if (!text) {
    throw new Error("This PDF does not contain selectable text.");
  }

  return {
    fileName: file.name,
    pageCount,
    text,
    links: [...new Set(links)]
  };
}
