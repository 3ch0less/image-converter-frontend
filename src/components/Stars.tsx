import { useEffect, useRef } from 'react'

const POOL = 65

type Phase = 'delay' | 'in' | 'twinkle' | 'out'

interface Star {
  x: number
  y: number
  size: number
  maxOpacity: number
  opacity: number
  phase: Phase
  elapsed: number
  delay: number
  fadeIn: number
  twinkle: number
  fadeOut: number
  freq: number
  amp: number
}

function spawn(): Star {
  return {
    x:          Math.random(),
    y:          Math.random(),
    size:       Math.random() < 0.12 ? 1.5 : 1,
    maxOpacity: 0.18 + Math.random() * 0.42,
    opacity:    0,
    phase:      'delay',
    elapsed:    0,
    delay:      0.2 + Math.random() * 4.8,
    fadeIn:     0.4 + Math.random() * 0.8,
    twinkle:    2   + Math.random() * 6,
    fadeOut:    0.6 + Math.random() * 1.4,
    freq:       0.4 + Math.random() * 1.8,
    amp:        0.25 + Math.random() * 0.55,
  }
}

export default function Stars() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    // Capture as a guaranteed non-null so closures below can use it safely
    const cv: HTMLCanvasElement = canvasRef.current
    const ctx = cv.getContext('2d')!

    const stars: Star[] = Array.from({ length: POOL }, (_, i) => {
      const s = spawn()
      s.delay = (i / POOL) * 6 + Math.random() * 1.5
      return s
    })

    let lastTime = performance.now()
    let rafId: number

    function resize() {
      cv.width  = window.innerWidth
      cv.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function tick(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now

      ctx.clearRect(0, 0, cv.width, cv.height)

      for (const s of stars) {
        s.elapsed += dt

        switch (s.phase) {
          case 'delay':
            if (s.elapsed >= s.delay) { s.elapsed = 0; s.phase = 'in' }
            break

          case 'in': {
            s.opacity = Math.min(s.elapsed / s.fadeIn, 1) * s.maxOpacity
            if (s.elapsed >= s.fadeIn) { s.elapsed = 0; s.phase = 'twinkle' }
            break
          }

          case 'twinkle': {
            const wave = Math.sin(s.elapsed * s.freq * Math.PI * 2) * 0.5 + 0.5
            s.opacity = s.maxOpacity * (1 - s.amp + wave * s.amp)
            if (s.elapsed >= s.twinkle) { s.elapsed = 0; s.phase = 'out' }
            break
          }

          case 'out': {
            s.opacity = Math.max(0, 1 - s.elapsed / s.fadeOut) * s.maxOpacity
            if (s.elapsed >= s.fadeOut) {
              Object.assign(s, spawn())
              s.delay = 0.05 + Math.random() * 1.5
            }
            break
          }
        }

        if (s.phase === 'delay' || s.opacity <= 0) continue

        ctx.globalAlpha = s.opacity
        ctx.fillStyle   = '#ffffff'
        ctx.beginPath()
        ctx.arc(s.x * cv.width, s.y * cv.height, s.size, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}
    />
  )
}
