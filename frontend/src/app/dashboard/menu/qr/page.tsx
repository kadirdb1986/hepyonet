"use client"

import { useRef, useCallback } from "react"
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QRMenuPage() {
  const { activeMembership } = useAuth()
  const canvasRef = useRef<HTMLDivElement>(null)

  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000"
  const slug = activeMembership?.restaurantSlug || ""
  const menuUrl = `${baseUrl}/m/${slug}`

  // ─── Download Helpers ─────────────────────────────────────────────────

  const downloadSVG = useCallback(() => {
    const svgEl = document.querySelector("#qr-svg-display svg") as SVGSVGElement | null
    if (!svgEl) return
    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svgEl)
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${slug}-menu-qr.svg`
    a.click()
    URL.revokeObjectURL(url)
  }, [slug])

  const downloadPNG = useCallback(() => {
    const canvasEl = canvasRef.current?.querySelector("canvas") as HTMLCanvasElement | null
    if (!canvasEl) return
    const url = canvasEl.toDataURL("image/png")
    const a = document.createElement("a")
    a.href = url
    a.download = `${slug}-menu-qr.png`
    a.click()
  }, [slug])

  const copyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(menuUrl)
      toast.success("Menu linki kopyalandi.")
    } catch {
      toast.error("Kopyalama basarisiz oldu.")
    }
  }, [menuUrl])

  // ─── Render ───────────────────────────────────────────────────────────

  if (!activeMembership) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">
            QR Menu
          </h1>
          <p className="text-on-surface-variant mt-2 text-lg">Restoran bilgisi yuklenemiyor.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">
          QR Menu
        </h1>
        <p className="text-on-surface-variant mt-2 text-lg">
          QR kodunu indirin veya menu linkini paylasin.
        </p>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: QR Code Card */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] p-8 flex flex-col items-center gap-6">
          <h2 className="text-lg font-bold text-on-surface self-start">QR Kod</h2>

          {/* Visible SVG QR */}
          <div
            id="qr-svg-display"
            className="bg-white p-6 rounded-xl shadow-sm"
          >
            <QRCodeSVG
              value={menuUrl}
              size={256}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>

          {/* Hidden canvas for PNG download */}
          <div ref={canvasRef} className="hidden">
            <QRCodeCanvas
              value={menuUrl}
              size={512}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={downloadPNG}
              className="bg-primary text-on-primary px-5 py-2.5 rounded-md font-bold flex items-center gap-2 shadow-lg hover:translate-y-[-1px] active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-xl">image</span>
              PNG Indir
            </button>
            <button
              onClick={downloadSVG}
              className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-lg">code</span>
              SVG Indir
            </button>
          </div>
        </div>

        {/* Right: Menu URL Card */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] p-8 flex flex-col gap-6">
          <h2 className="text-lg font-bold text-on-surface">Menu Linki</h2>

          {/* URL Input */}
          <div className="flex items-center gap-2">
            <input
              value={menuUrl}
              readOnly
              className="flex-1 px-4 py-3 bg-surface-container-low border-0 rounded-lg text-on-surface text-sm font-mono outline-none select-all"
            />
            <button
              onClick={copyUrl}
              className="bg-primary text-on-primary px-4 py-3 rounded-md font-bold flex items-center gap-2 hover:translate-y-[-1px] active:scale-95 transition-all text-sm whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-lg">content_copy</span>
              Kopyala
            </button>
          </div>

          {/* Open in new tab */}
          <a
            href={menuUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-surface-container-high transition-colors w-fit"
          >
            <span className="material-symbols-outlined text-lg">open_in_new</span>
            Yeni Sekmede Ac
          </a>

          {/* Preview */}
          <div className="flex-1 min-h-0">
            <p className="text-sm font-semibold text-on-surface-variant mb-3">Onizleme</p>
            <div className="rounded-xl overflow-hidden border border-outline-variant/15 bg-white" style={{ height: 400 }}>
              <iframe
                src={menuUrl}
                title="Menu Onizleme"
                className="w-full h-full border-0 origin-top-left"
                style={{
                  transform: "scale(0.75)",
                  width: "133.33%",
                  height: "133.33%",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
