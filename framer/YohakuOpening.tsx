import { useEffect, useRef, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

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

const SEEN_KEY = "yohaku-opening-seen"
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const clamp = (x: number) => Math.max(0, Math.min(1, x))

/**
 * 間 — the opening.
 * 白い紙に一本の水平線が引かれ、縦書きの一節が滲み出る。
 * 言葉が消えたあと一拍おいて、線が上下にひらき、映像があらわれる。
 *
 * ページの最前面に Fixed で置く。
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function YohakuOpening(props) {
    const { line1, line2, label, play = "Session", paper, ink, mute, style } = props
    useFonts()
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const [done, setDone] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)
    const topRef = useRef<HTMLDivElement>(null)
    const bottomRef = useRef<HTMLDivElement>(null)
    const pathRef = useRef<SVGPathElement>(null)
    const verseRef = useRef<HTMLDivElement>(null)
    const countRef = useRef<HTMLSpanElement>(null)
    const metaRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isCanvas) return
        const root = rootRef.current
        if (!root) return

        let seen = false
        try {
            seen = play === "Session" && sessionStorage.getItem(SEEN_KEY) === "1"
        } catch (e) {}
        if (seen) {
            setDone(true)
            return
        }

        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        const html = document.documentElement
        const prevOverflow = html.style.overflow
        html.style.overflow = "hidden"

        const chars = Array.from(root.querySelectorAll<HTMLSpanElement>("[data-ch]"))
        const n = chars.length

        // 読み込みの進み具合: ページと最初の映像が揃うまで 100 にはならない
        let loaded = document.readyState === "complete"
        const onLoad = () => (loaded = true)
        window.addEventListener("load", onLoad)
        const videoReady = () => {
            const v = document.querySelector("video")
            return !v || v.readyState >= 3
        }

        // 時間割 (ms)
        const T = reduce
            ? { line: 0, verse: 0, hold: 600, fade: 300, ma: 0, open: 500 }
            : { line: 1300, verse: 2000, hold: 4200, fade: 700, ma: 450, open: 1500 }
        const MAX_WAIT = 7000

        const pointer = { y: 0, cur: 0 }
        const onMove = (e: PointerEvent) => {
            const h = window.innerHeight
            pointer.y = Math.max(-1, Math.min(1, (e.clientY - h / 2) / (h / 2)))
        }
        window.addEventListener("pointermove", onMove)

        let start = performance.now()
        let fadeAt = -1
        let skip = false
        let raf = 0
        const finish = () => {
            try {
                sessionStorage.setItem(SEEN_KEY, "1")
            } catch (e) {}
            html.style.overflow = prevOverflow
            setDone(true)
        }
        const onSkip = () => {
            if (fadeAt < 0) {
                skip = true
            }
        }
        root.addEventListener("pointerdown", onSkip)
        window.addEventListener("keydown", onSkip)
        window.addEventListener("wheel", onSkip, { passive: true })

        const frame = (now: number) => {
            const t = now - start
            const w = window.innerWidth

            // 水平線が中央から左右へ引かれる
            const lp = T.line ? ease(clamp((t - 250) / T.line)) : 1
            // 糸のように、カーソルの方へわずかにたわむ
            pointer.cur += (pointer.y - pointer.cur) * 0.06
            const sag = pointer.cur * Math.min(18, w * 0.015) * (fadeAt < 0 ? 1 : 0)
            const half = (w / 2) * lp
            if (pathRef.current) {
                pathRef.current.setAttribute(
                    "d",
                    `M ${w / 2 - half} 1 Q ${w / 2} ${1 + sag * 2} ${w / 2 + half} 1`
                )
            }

            // 一節が一文字ずつ滲み出る
            const vt = t - 700
            for (let i = 0; i < n; i++) {
                const each = T.verse ? (vt - (i / n) * T.verse) / 700 : 1
                const p = ease(clamp(each))
                const el = chars[i]
                el.style.opacity = String(p)
                el.style.filter = p < 1 ? `blur(${(1 - p) * 6}px)` : "none"
                el.style.transform = `translateY(${(1 - p) * 0.35}em)`
            }

            // 数字は時間と読み込みの遅い方に合わせる
            const timeP = clamp(t / T.hold)
            const ready = (loaded && videoReady()) || t > MAX_WAIT
            const progress = ready ? timeP : Math.min(timeP, 0.92)
            if (countRef.current) {
                countRef.current.textContent = String(Math.floor(progress * 100)).padStart(3, "0")
            }

            if (fadeAt < 0 && ((progress >= 1 && t >= T.hold) || skip)) fadeAt = t
            if (fadeAt >= 0) {
                const ft = t - fadeAt
                const fp = clamp(ft / T.fade)
                if (verseRef.current) verseRef.current.style.opacity = String(1 - fp)
                if (metaRef.current) metaRef.current.style.opacity = String(1 - fp)
                // 言葉が消えたあとの、一拍の間
                const ot = ft - T.fade - T.ma
                const op = ease(clamp(ot / T.open))
                const h = window.innerHeight
                if (topRef.current) topRef.current.style.transform = `translate3d(0, ${-op * h * 0.5}px, 0)`
                if (bottomRef.current)
                    bottomRef.current.style.transform = `translate3d(0, ${op * h * 0.5}px, 0)`
                if (pathRef.current) pathRef.current.style.opacity = String(1 - clamp(ot / (T.open * 0.4)))
                if (op >= 1) {
                    finish()
                    return
                }
            }
            raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            html.style.overflow = prevOverflow
            window.removeEventListener("load", onLoad)
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("keydown", onSkip)
            window.removeEventListener("wheel", onSkip)
            root.removeEventListener("pointerdown", onSkip)
        }
    }, [isCanvas, play])

    if (done) return null

    const sans = `"Zen Kaku Gothic New", "Hiragino Sans", sans-serif`
    const mincho = `"Shippori Mincho", "Hiragino Mincho ProN", serif`
    const serif = `"Instrument Serif", "Times New Roman", serif`
    const lines = [line1, line2].filter(Boolean)
    let k = 0
    const verse = lines.map((l, li) => (
        <span key={li} style={{ display: "block" }}>
            {Array.from(l).map((c: string, ci) => (
                <span
                    key={ci}
                    data-ch={k++}
                    style={{
                        display: "inline-block",
                        opacity: isCanvas ? 1 : 0,
                        willChange: "opacity, filter, transform",
                    }}
                >
                    {c}
                </span>
            ))}
        </span>
    ))

    const panel = {
        position: "absolute" as const,
        left: 0,
        right: 0,
        height: "50%",
        background: paper,
        willChange: "transform",
    }

    return (
        <div
            ref={rootRef}
            aria-hidden
            style={{
                ...style,
                position: isCanvas ? "relative" : "fixed",
                inset: 0,
                width: isCanvas ? "100%" : "100vw",
                height: isCanvas ? "100%" : "100vh",
                zIndex: 1000,
                overflow: "hidden",
                cursor: "default",
                // キャンバスでは編集の邪魔をしないよう、薄く重ねるだけ
                opacity: isCanvas ? 0.35 : 1,
                pointerEvents: isCanvas ? "none" : "auto",
            }}
        >
            <div ref={topRef} style={{ ...panel, top: 0 }} />
            <div ref={bottomRef} style={{ ...panel, bottom: 0 }} />

            <svg
                style={{ position: "absolute", left: 0, top: "50%", width: "100%", height: 80, overflow: "visible" }}
            >
                <path
                    ref={pathRef}
                    d={isCanvas ? "M 0 1 L 4000 1" : "M 0 1 L 0 1"}
                    stroke={ink}
                    strokeWidth={1}
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>

            <div
                ref={verseRef}
                style={{
                    position: "absolute",
                    left: "50%",
                    bottom: "calc(50% + 36px)",
                    transform: "translateX(-50%)",
                    writingMode: "vertical-rl",
                    fontFamily: mincho,
                    fontSize: "clamp(14px, 1.15vw, 17px)",
                    lineHeight: 2.2,
                    letterSpacing: "0.26em",
                    color: ink,
                    whiteSpace: "nowrap",
                    userSelect: "none",
                }}
            >
                {verse}
            </div>

            <div
                ref={metaRef}
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: "calc(50% + 18px)",
                    padding: "0 clamp(20px, 2.6vw, 32px)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    color: mute,
                    fontFamily: sans,
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    userSelect: "none",
                }}
            >
                <span>{label}</span>
                <span style={{ fontFamily: serif, fontStyle: "italic", fontSize: 15, letterSpacing: 0 }}>
                    <span ref={countRef} style={{ fontVariantNumeric: "tabular-nums", color: ink }}>
                        {isCanvas ? "100" : "000"}
                    </span>
                </span>
            </div>
        </div>
    )
}

YohakuOpening.displayName = "Yohaku Opening"

addPropertyControls(YohakuOpening, {
    line1: { type: ControlType.String, title: "Line 1", defaultValue: "余白は、無い場所ではなく" },
    line2: { type: ControlType.String, title: "Line 2", defaultValue: "豊かさが息をひそめている場所" },
    label: { type: ControlType.String, title: "Label", defaultValue: "余白研究室　Yohaku Lab." },
    play: {
        type: ControlType.Enum,
        title: "Play",
        options: ["Session", "Always"],
        optionTitles: ["初回のみ", "毎回"],
        defaultValue: "Session",
    },
    paper: { type: ControlType.Color, title: "Paper", defaultValue: "#F7F7F5" },
    ink: { type: ControlType.Color, title: "Ink", defaultValue: "#111111" },
    mute: { type: ControlType.Color, title: "Mute", defaultValue: "#8C8B87" },
})
