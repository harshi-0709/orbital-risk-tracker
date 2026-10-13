import { useEffect, useRef } from "react";

/* Full-screen starfield. One canvas, fixed behind everything, shared by the landing page and the dashboard.
   The nebula colour lives in CSS (.space-bg) so only the stars cost JavaScript. */
export default function SpaceBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, stars = [], raf = 0;

    function build() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((w * h) / 4800);
      stars = Array.from({ length: count }, () => {
        const size = Math.random();
        const tint = Math.random();
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: size < 0.74 ? 0.45 + Math.random() * 0.45 : size < 0.95 ? 0.9 + Math.random() * 0.5 : 1.5 + Math.random() * 0.8,
          base: 0.3 + Math.random() * 0.7,
          speed: 0.6 + Math.random() * 1.8,
          phase: Math.random() * Math.PI * 2,
          hue: tint < 0.07 ? 214 : tint < 0.15 ? 320 : tint < 0.21 ? 150 : tint < 0.27 ? 34 : 0,   // a few tinted stars: blue, pink, green, warm
          sat: tint < 0.27 ? 70 : 0,
        };
      });
    }

    function draw(time) {
      ctx.clearRect(0, 0, w, h);
      const t = time / 1000;
      for (const s of stars) {
        const twinkle = reduced ? 1 : 0.72 + 0.28 * Math.sin(t * s.speed + s.phase);
        const alpha = s.base * twinkle;
        const x = reduced ? s.x : (((s.x - t * s.r * 2.2) % w) + w) % w;   // slow sideways drift, bigger stars move more
        ctx.fillStyle = `hsla(${s.hue}, ${s.sat}%, 92%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1.5) {                                                     // soft halo on the brightest few
          const g = ctx.createRadialGradient(x, s.y, 0, x, s.y, s.r * 5);
          g.addColorStop(0, `hsla(${s.hue}, ${s.sat}%, 90%, ${alpha * 0.35})`);
          g.addColorStop(1, `hsla(${s.hue}, ${s.sat}%, 90%, 0)`);
          ctx.fillStyle = g;
          ctx.fillRect(x - s.r * 5, s.y - s.r * 5, s.r * 10, s.r * 10);
        }
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    }

    build();
    draw(0);
    const onResize = () => { build(); if (reduced) draw(0); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);

  return (
    <div className="space-bg" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}