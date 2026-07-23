/**
 * Hidden SVG filter that gives `.rounded-cozy` surfaces (and anything opted
 * in via `.sketchy-edge`) a hand-drawn wobble. Rendered once; referenced from
 * CSS via `filter: url(#sketchy-edge)` — see src/index.css.
 */
export function SketchyDefs() {
  return (
    <svg aria-hidden="true" className="absolute size-0 overflow-hidden">
      {/* Mild — the blanket default on every `.rounded-cozy` surface, including
          dense panels (filter sidebar, forms) where small text needs to stay
          legible. */}
      <filter id="sketchy-edge">
        <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      {/* Strong — opt-in via `.sketchy-edge-strong` for sparse, large-text
          display cards (restaurant cards, tile links) where a bolder
          hand-drawn wobble reads as charming rather than illegible. */}
      <filter id="sketchy-edge-strong">
        <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  )
}
