const NOISE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"

export function LiquidBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 overflow-hidden bg-void-deep"
    >
      <div className="animate-liquid-drift-1 absolute left-[-15%] top-[-15%] h-[60vw] w-[60vw] max-h-[560px] max-w-[560px] rounded-full bg-violet/40 mix-blend-screen blur-[90px]" />
      <div className="animate-liquid-drift-2 absolute right-[-20%] top-[10%] h-[55vw] w-[55vw] max-h-[480px] max-w-[480px] rounded-full bg-magenta/35 mix-blend-screen blur-[90px]" />
      <div className="animate-liquid-drift-3 absolute bottom-[-20%] left-[5%] h-[65vw] w-[65vw] max-h-[600px] max-w-[600px] rounded-full bg-cyan/25 mix-blend-screen blur-[100px]" />
      <div className="absolute inset-0 bg-void-deep/45" />
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{ backgroundImage: `url("${NOISE}")` }}
      />
    </div>
  )
}
