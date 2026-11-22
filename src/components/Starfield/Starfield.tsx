import { useEffect, useRef } from 'react';
import { useDeviceTier } from '../../hooks/useDeviceTier';
import './Starfield.css';

export type StarMode = 'drift' | 'warp' | 'gold';

interface Props {
  mode: StarMode;
}

interface Star {
  x: number;
  y: number;
  z: number;
  pz: number;
  hue: number;
  size: number;
  tw: number;
}

const BLUE = ['168,223,255', '57,139,255', '102,229,245', '216,228,242', '169,155,239'];
const GOLD = ['242,198,109', '255,228,170', '255,244,214', '216,170,90', '168,223,255'];

/**
 * Full-screen canvas starfield.
 *  drift – calm, slowly floating stars
 *  warp  – stars recede into the centre (time running backwards)
 *  gold  – warm particles rising, for the birthday chamber
 */
export function Starfield({ mode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef<StarMode>(mode);
  const tier = useDeviceTier();
  modeRef.current = mode;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let stars: Star[] = [];
    let raf = 0;
    let speed = 0.0006;
    let goldMix = 0;
    let running = true;

    const count = () => {
      const small = window.innerWidth < 700;
      if (tier === 'minimal') return 70;
      if (tier === 'low') return small ? 80 : 120;
      return small ? 170 : 280;
    };

    const spawn = (s: Star, far: boolean) => {
      s.x = (Math.random() * 2 - 1) * 1.4;
      s.y = (Math.random() * 2 - 1) * 1.4;
      s.z = far ? Math.random() * 0.9 + 0.1 : 0.08 + Math.random() * 0.15;
      s.pz = s.z;
      s.hue = Math.floor(Math.random() * BLUE.length);
      s.size = Math.random() * 1.2 + 0.4;
      s.tw = Math.random() * Math.PI * 2;
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = count();
      if (stars.length !== n) {
        stars = Array.from({ length: n }, () => {
          const s = {} as Star;
          spawn(s, true);
          return s;
        });
      }
      if (tier === 'minimal') draw(0);
    };

    const draw = (t: number) => {
      const m = modeRef.current;
      const targetSpeed = m === 'warp' ? 0.022 : m === 'gold' ? 0.0012 : 0.0005;
      speed += (targetSpeed - speed) * (m === 'warp' ? 0.03 : 0.04);
      const goldTarget = m === 'gold' ? 1 : 0;
      goldMix = tier === 'minimal' ? goldTarget : goldMix + (goldTarget - goldMix) * 0.02;

      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const scale = Math.max(w, h) * 0.5;
      const streak = speed > 0.004;

      for (const s of stars) {
        s.pz = s.z;
        if (m === 'gold') {
          // gentle upward drift with slight recession
          s.y -= 0.0009 + s.size * 0.0004;
          s.z += speed * 0.2;
          if (s.y < -1.5 || s.z > 1) spawn(s, true);
        } else {
          // positive z velocity = receding to the centre (time reversing)
          s.z += m === 'warp' ? speed : speed * 0.3;
          if (s.z > 1) spawn(s, false);
        }
        const px = cx + (s.x / s.z) * scale * 0.35;
        const py = cy + (s.y / s.z) * scale * 0.35;
        if (px < -50 || px > w + 50 || py < -50 || py > h + 50) {
          if (m !== 'gold') {
            s.z = Math.min(1, s.z + 0.15);
          }
          continue;
        }
        const depth = 1 - s.z;
        const twinkle = 0.65 + 0.35 * Math.sin(t * 0.002 + s.tw);
        const alpha = Math.min(1, depth * 1.4) * twinkle;
        const col = goldMix > 0.5 ? GOLD[s.hue] : BLUE[s.hue];
        const r = s.size * (0.6 + depth * 1.8);

        if (streak) {
          const ppx = cx + (s.x / s.pz) * scale * 0.35;
          const ppy = cy + (s.y / s.pz) * scale * 0.35;
          // extend the tail outward so the motion reads as "inward"
          const tx = px + (px - ppx) * -6;
          const ty = py + (py - ppy) * -6;
          ctx.strokeStyle = `rgba(${col},${alpha * 0.8})`;
          ctx.lineWidth = r;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(tx, ty);
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(${col},${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (running && tier !== 'minimal') raf = requestAnimationFrame(draw);
    };

    const onVis = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(draw);
      }
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [tier]);

  // Static field for reduced motion: redraw when mode changes so gold still shows.
  useEffect(() => {
    if (tier !== 'minimal') return;
    const id = requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    return () => cancelAnimationFrame(id);
  }, [mode, tier]);

  return (
    <div className={`starfield starfield--${mode}`} aria-hidden="true">
      <div className="starfield__nebula" />
      <canvas ref={canvasRef} className="starfield__canvas" />
    </div>
  );
}
