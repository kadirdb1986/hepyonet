export default function PublicMenuNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-100 to-amber-200 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-amber-600/10 flex items-center justify-center mx-auto mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-700"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold text-amber-950 tracking-tight mb-3">
          Menu Bulunamadi
        </h1>
        <p className="text-amber-800/70 text-base mb-6">
          Aradiginiz restoran menusu bulunamadi. QR kodu tekrar tarayin veya restoran ile iletisime gecin.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-600/10 text-amber-700 text-sm font-medium">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          QR kodu tekrar tarayin
        </div>
      </div>
    </div>
  )
}
