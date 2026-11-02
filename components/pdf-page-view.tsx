"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoaderCircleIcon, MinusIcon, PlusIcon, MaximizeIcon } from "lucide-react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";

/**
 * Renders one PDF page to a canvas with pdf.js.
 *
 * Deliberately not an <iframe> to the PDF: the browser's built-in viewer is not
 * guaranteed to exist (some environments download the file instead), and its
 * chrome cannot be controlled. Canvas rendering behaves the same everywhere.
 */
export function PdfPageView({
  url,
  pageNo,
  scanning = false,
  elapsed = 0,
  className = "",
  onLoaded,
}: {
  url: string;
  pageNo: number;
  /** Shows the capture overlay while a translation is running. */
  scanning?: boolean;
  /** Seconds elapsed, shown in the overlay so a slow page reads as progress. */
  elapsed?: number;
  className?: string;
  /** Reports the document's page count once it is known. */
  onLoaded?: (pages: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);

  // Held in a ref so a parent re-render does not re-trigger the render effect
  // and repaint the page. Written in an effect, never during render.
  const onLoadedRef = useRef(onLoaded);
  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const loadRef = useRef<PDFDocumentLoadingTask | null>(null);
  const taskRef = useRef<RenderTask | null>(null);

  const [zoom, setZoom] = useState(0); // 0 = fit width
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        if (!docRef.current) {
          // These four asset paths are not optional. pdf.js fetches CMaps,
          // standard fonts, ICC profiles and wasm decoders at runtime; without
          // them, CID-keyed and non-embedded fonts get the wrong glyph
          // mapping, which is what breaks Arabic shaping.
          loadRef.current = pdfjs.getDocument({
            url,
            cMapUrl: "/pdfjs/cmaps/",
            cMapPacked: true,
            standardFontDataUrl: "/pdfjs/standard_fonts/",
            iccUrl: "/pdfjs/iccs/",
            wasmUrl: "/pdfjs/wasm/",
          });
          docRef.current = await loadRef.current.promise;
        }
        if (cancelled) return;

        const doc = docRef.current;
        onLoadedRef.current?.(doc.numPages);

        // Pages can be added to a book beyond the source file's own length;
        // asking pdf.js for one of those would throw.
        if (pageNo > doc.numPages) {
          setError(`މި ޞަފުޙާ PDF ގައި ނެތެވެ (${doc.numPages} ޞަފުޙާ)`);
          setLoading(false);
          return;
        }

        const page = await doc.getPage(pageNo);
        if (cancelled) return;

        const canvas = canvasRef.current;
        const holder = holderRef.current;
        if (!canvas || !holder) return;

        const base = page.getViewport({ scale: 1 });
        const fit = (holder.clientWidth - 16) / base.width;
        const scale = zoom > 0 ? zoom : Math.max(0.2, fit);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: scale * dpr });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

        taskRef.current?.cancel();
        const task = page.render({ canvas, viewport });
        taskRef.current = task;
        await task.promise;
        if (!cancelled) setLoading(false);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        // Cancelling a render on page change is expected, not a failure.
        if (!/cancel/i.test(message)) {
          setError(message);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      taskRef.current?.cancel();
    };
  }, [url, pageNo, zoom]);

  // Tear down the worker when the viewer unmounts; destroy() lives on the
  // loading task, not the document proxy.
  useEffect(
    () => () => {
      loadRef.current?.destroy();
      loadRef.current = null;
      docRef.current = null;
    },
    []
  );

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="border-rule flex items-center gap-1 border-b px-2 py-1.5">
        <Button
          variant="ghost"
          size="icon"
          aria-label="ކުޑަކުރޭ"
          onClick={() => setZoom((z) => Math.max(0.25, (z || 1) - 0.25))}
        >
          <MinusIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="ބޮޑުކުރޭ"
          onClick={() => setZoom((z) => Math.min(4, (z || 1) + 0.25))}
        >
          <PlusIcon />
        </Button>
        <Button variant="ghost" size="icon" aria-label="ފުޅާކުރޭ" onClick={() => setZoom(0)}>
          <MaximizeIcon />
        </Button>
        <span className="text-faint-ink font-arabic ms-1 text-[12px] tabular-nums">
          {zoom > 0 ? `${Math.round(zoom * 100)}%` : "ފިޓް"}
        </span>
        {loading && <LoaderCircleIcon className="text-muted-ink ms-auto size-4 animate-spin" />}
      </div>

      <div ref={holderRef} className="bg-paper-3 grid flex-1 place-items-start justify-center overflow-auto p-2">
        {error ? (
          <p className="text-destructive p-6 text-center text-[13.5px]">{error}</p>
        ) : (
          <div className="relative">
            <canvas ref={canvasRef} className="shadow-sm" />

            {scanning && (
              <div
                className="scan-overlay pointer-events-none absolute inset-0"
                role="status"
                aria-live="polite"
              >
                <span className="sr-only">ޞަފުޙާ ކިޔައި ތަރުޖަމާކުރަނީ</span>

                {/* Capture frame */}
                <span className="scan-corner scan-corner--tl" />
                <span className="scan-corner scan-corner--tr" />
                <span className="scan-corner scan-corner--bl" />
                <span className="scan-corner scan-corner--br" />

                {/* Sweep */}
                <span className="scan-beam" />

                <span className="scan-pill">
                  <span className="scan-dot" />
                  ތަރުޖަމާކުރަނީ… {elapsed > 0 && <span className="font-arabic tabular-nums">{elapsed}s</span>}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
