import { useEffect, useRef, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { LogoSVG } from "./YohakuLogo.tsx"

const FONT_HREF =
    "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Shippori+Mincho&family=Zen+Kaku+Gothic+New:wght@400&display=swap"

function useFonts() {
    useEffect(() => {
        if (typeof document === "undefined") return
        if (document.querySelector(`link[data-yohaku-fonts]`)) return
        const l = document.createElement("link")
        l.rel = "stylesheet"
        l.href = FONT_HREF
        l.setAttribute("data-yohaku-fonts", "")
        document.head.appendChild(l)
    }, [])
}

/**
 * 余白の向こう — the cover. 映像の上に、波のロゴ。
 * カーソルが動くと、ロゴの波だけが水面のように揺らぐ。
 * The cursor becomes a soft lens: only inside it does the film appear.
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */
export default function YohakuCover(props) {
    const {
        title,
        kicker,
        tagline,
        image,
        video,
        lensSize,
        mode = "Full",
        paper,
        ink,
        mute,
        style,
    } = props
    useFonts()
    const rootRef = useRef<HTMLDivElement>(null)
    const mediaRef = useRef<HTMLDivElement>(null)
    const coordRef = useRef<HTMLSpanElement>(null)
    const ringRef = useRef<HTMLDivElement>(null)
    const rippleRef = useRef(0)
    const logoRef = useRef<HTMLDivElement>(null)
    const full = mode !== "Lens"
    const [w, setW] = useState(1200)
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    useEffect(() => {
        const el = rootRef.current
        if (!el) return
        const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    useEffect(() => {
        const root = rootRef.current
        const media = mediaRef.current
        if (!root || !media) return
        const target = { x: 0.62, y: 0.46, r: isCanvas ? 1 : 0 }
        const cur = { x: 0.62, y: 0.46, r: isCanvas ? 1 : 0 }
        let hovering = false
        let last = performance.now()
        let raf = 0
        const fine =
            typeof window !== "undefined" &&
            window.matchMedia("(hover: hover) and (pointer: fine)").matches
        const reduce =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches

        const paint = (t: number) => {
            const rect = root.getBoundingClientRect()
            const base = Math.min(lensSize, rect.width * 0.42)
            const breathe = 1 + Math.sin(t / 1800) * 0.04
            const r = base * cur.r * breathe
            const px = cur.x * rect.width
            const py = cur.y * rect.height
            if (full) {
                // 背景はすべて見せたまま、カーソルには細い輪だけが寄り添う
                const ring = ringRef.current
                if (ring) {
                    const d = Math.max(28, base * 0.32) * breathe
                    ring.style.width = ring.style.height = `${d}px`
                    ring.style.transform = `translate3d(${px - d / 2}px, ${py - d / 2}px, 0)`
                    ring.style.opacity = String(Math.min(1, cur.r * 1.4))
                }
            } else {
                const m = `radial-gradient(circle at ${px}px ${py}px, #000 ${r * 0.9}px, transparent ${r}px)`
                media.style.webkitMaskImage = m
                media.style.maskImage = m
            }
            if (coordRef.current) {
                coordRef.current.textContent = `x ${cur.x.toFixed(3)}　y ${cur.y.toFixed(3)}`
            }
        }

        if (isCanvas) {
            paint(0)
            return
        }

        const loop = (t: number) => {
            const dt = Math.min(64, t - last)
            last = t
            if (!fine || !hovering) {
                // 人がいないとき、レンズはゆっくり漂う
                const s = t / 1000
                target.x = 0.5 + Math.sin(s * 0.13) * 0.28
                target.y = 0.5 + Math.sin(s * 0.21 + 1.3) * 0.2
                target.r = fine ? 0.55 : 0.8
            }
            const k = reduce ? 1 : 1 - Math.pow(0.0025, dt / 1000)
            cur.x += (target.x - cur.x) * k
            cur.y += (target.y - cur.y) * k
            cur.r += (target.r - cur.r) * (reduce ? 1 : k * 0.6)
            rippleRef.current *= Math.pow(0.03, dt / 1000)
            // ロゴはカーソルからわずかに遠ざかる。風に押される水面のように
            if (logoRef.current && !reduce) {
                const ox = (0.5 - cur.x) * 14 * cur.r
                const oy = (0.5 - cur.y) * 10 * cur.r
                logoRef.current.style.transform = `translate3d(calc(-50% + ${ox.toFixed(2)}px), calc(-56% + ${oy.toFixed(2)}px), 0)`
            }
            paint(t)
            raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)

        let lx = -1,
            ly = -1
        const onMove = (e: PointerEvent) => {
            const rect = root.getBoundingClientRect()
            if (lx >= 0) {
                const v = Math.hypot(e.clientX - lx, e.clientY - ly)
                rippleRef.current = Math.min(1, rippleRef.current + v / 260)
            }
            lx = e.clientX
            ly = e.clientY
            target.x = (e.clientX - rect.left) / rect.width
            target.y = (e.clientY - rect.top) / rect.height
            target.r = 1
            hovering = true
        }
        const onLeave = () => {
            hovering = false
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerleave", onLeave)
        return () => {
            cancelAnimationFrame(raf)
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerleave", onLeave)
        }
    }, [lensSize, isCanvas, full])

    const logoW = narrow0(w) ? w * 0.82 : Math.min(w * 0.56, 1100)
    const narrow = w < 640
    const small = Math.max(10, Math.min(12, w * 0.01))
    const sans = `"Zen Kaku Gothic New", "Hiragino Sans", sans-serif`

    return (
        <div
            ref={rootRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background: paper,
                cursor: "crosshair",
                touchAction: "pan-y",
            }}
        >
            <div
                ref={mediaRef}
                aria-hidden
                style={{
                    position: "absolute",
                    inset: 0,
                    ...(full
                        ? {}
                        : {
                              WebkitMaskImage: "radial-gradient(circle, transparent 0, transparent 0)",
                              maskImage: "radial-gradient(circle, transparent 0, transparent 0)",
                          }),
                }}
            >
                {video ? (
                    <video
                        src={video}
                        poster={image?.src}
                        autoPlay
                        muted
                        loop
                        playsInline
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                ) : image?.src ? (
                    <img
                        src={image.src}
                        srcSet={image.srcSet}
                        alt={image.alt || ""}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                ) : null}
            </div>

            {full ? (
                <div
                    aria-hidden
                    style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.18)", pointerEvents: "none" }}
                />
            ) : null}
            {full ? (
                <div
                    ref={ringRef}
                    aria-hidden
                    style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        borderRadius: "50%",
                        border: "1px solid rgba(255,255,255,0.85)",
                        pointerEvents: "none",
                        opacity: 0,
                    }}
                />
            ) : null}

            <div
                ref={logoRef}
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: logoW,
                    transform: "translate3d(-50%, -56%, 0)",
                    mixBlendMode: full ? "normal" : "difference",
                    pointerEvents: "none",
                    userSelect: "none",
                    willChange: "transform",
                }}
            >
                <h1 style={{ margin: 0, fontSize: 0, lineHeight: 0 }}>
                    <LogoSVG part="Full" color="#FFFFFF" title={title} rippleRef={rippleRef} style={{ width: "100%", height: "auto" }} />
                </h1>
            </div>

            <div
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: narrow ? "0 20px 24px" : "0 32px 28px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    gap: 24,
                    fontFamily: sans,
                    fontSize: small,
                    letterSpacing: "0.08em",
                    lineHeight: 1.8,
                    color: "#fff",
                    mixBlendMode: full ? "normal" : "difference",
                    pointerEvents: "none",
                }}
            >
                <span>{kicker}</span>
                <span style={{ textAlign: "center" }}>{tagline}</span>
                <span
                    ref={coordRef}
                    style={{
                        display: narrow ? "none" : "inline",
                        fontVariantNumeric: "tabular-nums",
                        minWidth: 150,
                        textAlign: "right",
                    }}
                >
                    x 0.620　y 0.460
                </span>
            </div>
        </div>
    )
}

function narrow0(w: number) {
    return w < 640
}

YohakuCover.displayName = "Yohaku Cover"

addPropertyControls(YohakuCover, {
    title: { type: ControlType.String, title: "Title", defaultValue: "Yohaku Lab." },
    kicker: { type: ControlType.String, title: "Kicker", defaultValue: "余白研究室" },
    tagline: { type: ControlType.String, title: "Tagline", defaultValue: "余白から生まれる文化" },
    image: { type: ControlType.ResponsiveImage, title: "Image" },
    video: { type: ControlType.File, title: "Video", allowedFileTypes: ["mp4", "webm", "mov"] },
    mode: {
        type: ControlType.Enum,
        title: "Mode",
        options: ["Full", "Lens"],
        optionTitles: ["背景を全面に", "レンズの中だけ"],
        defaultValue: "Full",
    },
    lensSize: { type: ControlType.Number, title: "Lens", defaultValue: 260, min: 80, max: 600, step: 10, unit: "px" },
    paper: { type: ControlType.Color, title: "Paper", defaultValue: "#F7F7F5" },
    ink: { type: ControlType.Color, title: "Ink", defaultValue: "#111111" },
    mute: { type: ControlType.Color, title: "Mute", defaultValue: "#8C8B87" },
})
