// Yohaku no Niwa GIN — the bottle, still, in front of its own name.
// The words from the back label surface in the whitespace when the section comes into view.
import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

const FONT_HREF =
    "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Shippori+Mincho:wght@400&family=Zen+Kaku+Gothic+New:wght@400&display=swap"

const DEFAULT_BOTTLE = "https://framerusercontent.com/images/M1VCCaOkZ1HHTGdf0FgExgF4Zdk.webp"

const DEFAULT_TEXT = `就寝前の静かなひと時、
深い森の中で深呼吸をするようにヒノキが香る。
白檀のお香のような燻煙は森の霧のような余韻を残す。
廃材になるはずだったヒノキは今ここに意味をもたらし、
あなたの思考に、暮らしに余白を作る。
余白の美の概念をここに。`

function ensureFonts() {
    if (typeof document === "undefined") return
    if (document.querySelector("link[data-yohaku-gin]")) return
    const l = document.createElement("link")
    l.rel = "stylesheet"
    l.href = FONT_HREF
    l.setAttribute("data-yohaku-gin", "")
    document.head.appendChild(l)
}

type Props = {
    bottle?: { src: string; alt?: string } | string
    title: string
    accent: string
    description: string
    bottomLeft: string
    bottomRight: string
    paper: string
    ink: string
    mute: string
    style?: React.CSSProperties
}

const srcOf = (v: any) => (typeof v === "string" ? v : v?.src || "")

export default function YohakuGin(props: Props) {
    const { title, accent, description, bottomLeft, bottomRight, paper, ink, mute } = props
    const bottle = srcOf(props.bottle) || DEFAULT_BOTTLE
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    const hostRef = React.useRef<HTMLElement>(null)
    const [w, setW] = React.useState(1200)
    const [h, setH] = React.useState(860)
    const [seen, setSeen] = React.useState(false)
    const lines = React.useMemo(
        () => description.split("\n").map((s) => s.trim()).filter(Boolean),
        [description]
    )

    React.useEffect(() => {
        ensureFonts()
        const el = hostRef.current
        if (!el) return
        const measure = () => {
            const r = el.getBoundingClientRect()
            setW(r.width)
            setH(r.height)
        }
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(el)
        const io = new IntersectionObserver(
            (es) => es.forEach((e) => e.isIntersecting && setSeen(true)),
            { threshold: 0.45 }
        )
        io.observe(el)
        return () => {
            ro.disconnect()
            io.disconnect()
        }
    }, [])

    const show = seen || isCanvas
    const narrow = w < 720
    const pad = narrow ? 20 : 40
    const ease = "cubic-bezier(.22,.61,.36,1)"

    // bottle size: by height, leaving air above and below
    const bottleH = narrow ? Math.min(h * 0.56, w * 1.3) : h * 0.78
    const bottleW = bottleH * (690 / 1440)
    const bottleTop = narrow ? h * 0.07 : (h - bottleH) / 2 + h * 0.01
    // the name crosses the shoulders, where the glass is clear, so it reads through the bottle
    const titleY = bottleTop + bottleH * 0.315
    const titleSize = narrow ? w * 0.104 : Math.min(w * 0.112, h * 0.2)
    // the words sit to the right, just under the name
    const wordsLeft = w / 2 + bottleW / 2 + Math.max(40, (w / 2 - bottleW / 2) * 0.12)

    const corner: React.CSSProperties = {
        position: "absolute",
        fontFamily: `"Zen Kaku Gothic New", sans-serif`,
        fontSize: 11,
        letterSpacing: "0.14em",
        color: mute,
        whiteSpace: "nowrap",
    }

    return (
        <section
            ref={hostRef as any}
            aria-label={`${title} ${accent}`}
            style={{
                ...props.style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background: paper,
            }}
        >
            {/* the name */}
            <h2
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: titleY,
                    transform: "translateY(-50%)",
                    margin: 0,
                    textAlign: "center",
                    fontFamily: `"Cormorant Garamond", "Instrument Serif", serif`,
                    fontWeight: 300,
                    fontSize: titleSize,
                    lineHeight: 1,
                    letterSpacing: "-0.015em",
                    color: ink,
                    whiteSpace: "nowrap",
                    opacity: show ? 1 : 0,
                    transition: `opacity 2.4s ${ease}`,
                    pointerEvents: "none",
                    userSelect: "none",
                }}
            >
                {title} <i style={{ fontWeight: 300 }}>{accent}</i>
            </h2>

            {/* soft contact shadow */}
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: bottleTop + bottleH * 0.985,
                    width: bottleW * 1.15,
                    height: bottleW * 0.12,
                    transform: "translate(-50%, -50%)",
                    background:
                        "radial-gradient(closest-side, rgba(17,17,17,0.16), rgba(17,17,17,0.05) 60%, rgba(17,17,17,0) 100%)",
                    filter: "blur(2px)",
                    opacity: show ? 1 : 0,
                    transition: `opacity 1.8s ${ease} .2s`,
                    pointerEvents: "none",
                }}
            />

            {/* the bottle */}
            <img
                src={bottle}
                alt={
                    typeof props.bottle === "object" && props.bottle?.alt
                        ? props.bottle.alt
                        : "Yohaku no Niwa Forest Distilled Gin"
                }
                draggable={false}
                style={{
                    position: "absolute",
                    left: "50%",
                    top: bottleTop,
                    height: bottleH,
                    width: bottleW,
                    transform: show ? "translate(-50%, 0)" : "translate(-50%, 10px)",
                    opacity: show ? 1 : 0,
                    transition: `opacity 1.8s ${ease} .2s, transform 2.2s ${ease} .2s`,
                    userSelect: "none",
                    pointerEvents: "none",
                }}
            />

            {/* the words from the back label */}
            <div
                style={
                    narrow
                        ? {
                              position: "absolute",
                              left: 24,
                              right: 24,
                              top: bottleTop + bottleH + h * 0.06,
                              textAlign: "center",
                          }
                        : {
                              position: "absolute",
                              left: wordsLeft,
                              top: titleY + titleSize * 0.62,
                          }
                }
            >
                {lines.map((l, i) => (
                    <p
                        key={i}
                        style={{
                            margin: 0,
                            fontFamily: `"Shippori Mincho", serif`,
                            fontSize: narrow ? 12.5 : 13,
                            lineHeight: narrow ? 2.1 : 2.3,
                            letterSpacing: "0.06em",
                            color: ink,
                            whiteSpace: "nowrap",
                            opacity: show ? 1 : 0,
                            filter: show ? "blur(0px)" : "blur(6px)",
                            transform: show ? "translate(0,0)" : "translateY(6px)",
                            transition: `opacity 1.6s ${ease}, filter 1.6s ${ease}, transform 1.8s ${ease}`,
                            transitionDelay: `${1.2 + i * 0.35}s`,
                        }}
                    >
                        {l}
                    </p>
                ))}
            </div>

            {bottomLeft && (
                <div style={{ ...corner, left: pad, bottom: narrow ? pad + 20 : pad }}>{bottomLeft}</div>
            )}
            {bottomRight && (
                <div style={narrow ? { ...corner, left: pad, bottom: pad } : { ...corner, right: pad, bottom: pad }}>
                    {bottomRight}
                </div>
            )}
        </section>
    )
}

YohakuGin.displayName = "Yohaku no Niwa GIN"

YohakuGin.defaultProps = {
    title: "Yohaku no Niwa",
    accent: "Gin",
    description: DEFAULT_TEXT,
    bottomLeft: "Forest Distilled Gin — Hinoki Leaves, Nagano",
    bottomRight: "500ml / 40% vol",
    paper: "#F7F7F5",
    ink: "#111111",
    mute: "#8C8B87",
}

addPropertyControls(YohakuGin, {
    bottle: { type: ControlType.ResponsiveImage, title: "Bottle" },
    title: { type: ControlType.String, title: "Title" },
    accent: { type: ControlType.String, title: "Accent" },
    description: { type: ControlType.String, title: "Back Text", displayTextArea: true },
    bottomLeft: { type: ControlType.String, title: "Bottom Left" },
    bottomRight: { type: ControlType.String, title: "Bottom Right" },
    paper: { type: ControlType.Color, title: "Paper" },
    ink: { type: ControlType.Color, title: "Ink" },
    mute: { type: ControlType.Color, title: "Mute" },
})
