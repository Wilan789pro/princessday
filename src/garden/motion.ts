/**
 * "Draw-on" stroke animation using the native SVG `pathLength="1"` attribute
 * and an animated dash offset. (Framer Motion's own `pathLength` value works at
 * runtime but its v11 typings reject it on motion SVG elements.)
 */
export const drawOn = (delay = 0, duration = 1.2, fade = true) => ({
  pathLength: 1,
  strokeDasharray: '1 1',
  initial: { strokeDashoffset: 1, opacity: fade ? 0 : 1 },
  animate: { strokeDashoffset: 0, opacity: 1 },
  transition: {
    strokeDashoffset: { delay, duration, ease: 'easeInOut' as const },
    opacity: { delay, duration: 0.2 },
  },
});
