// /thanks — where Square returns the buyer after payment.
// One large word, a few lines, and one more line that changes with the hour the order was placed.
// If Square passes an order id in the URL, a short reference is shown quietly at the foot.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

const FONT_HREF =
    "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Shippori+Mincho:wght@400&family=Zen+Kaku+Gothic+New:wght@400&display=swap"

function ensureFonts() {
    if (typeof document === "undefined") return
    if (document.querySelector("link[data-yohaku-thanks]")) return
    const l = document.createElement("link")
    l.rel = "stylesheet"
    l.href = FONT_HREF
    l.setAttribute("data-yohaku-thanks", "")
    document.head.appendChild(l)
}

type Props = {
    word: string
    title: string
    body: string
    morning: string
    afternoon: string
    evening: string
    night: string
    email: string
    backHref: string
    paper: string
    ink: string
    mute: string
    style?: React.CSSProperties
}

const serif = `"Instrument Serif", "Shippori Mincho", serif`
const mincho = `"Shippori Mincho", serif`
const gothic = `"Zen Kaku Gothic New", sans-serif`

function lineFor(h: number, p: Props) {
    if (h >= 5 && h < 11) return p.morning
    if (h >= 11 && h < 17) return p.afternoon
    if (h >= 17 && h < 23) return p.evening
    return p.night
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function YohakuThanks(props: Props) {
    const { word, title, body, email, backHref, paper, ink, mute } = props
    const [shown, setShown] = React.useState(false)
    const [hourLine, setHourLine] = React.useState("")
    const [ref, setRef] = React.useState("")
    const [w, setW] = React.useState(1200)
    const hostRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        ensureFonts()
        setHourLine(lineFor(new Date().getHours(), props))
        try {
            const q = new URLSearchParams(window.location.search)
            const id = q.get("orderId") || q.get("transactionId") || q.get("checkoutId") || ""
            if (id) setRef(id.slice(-8).toUpperCase())
        } catch (e) {}
        const el = hostRef.current
        let ro: ResizeObserver | undefined
        if (el) {
            ro = new ResizeObserver(() => setW(el.getBoundingClientRect().width))
            ro.observe(el)
        }
        const t = setTimeout(() => setShown(true), 200)
        return () => {
            clearTimeout(t)
            ro?.disconnect()
        }
    }, [])

    const phone = w < 760
    const fade = (delay: number): React.CSSProperties => ({
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(6px)",
        transition: `opacity 1.8s ease ${delay}s, transform 1.8s ease ${delay}s`,
    })
    const small: React.CSSProperties = { fontFamily: gothic, fontSize: 11, color: mute, letterSpacing: "0.12em" }

    return (
        <div
            ref={hostRef}
            style={{
                ...props.style,
                width: "100%",
                height: "100%",
                minHeight: "100vh",
                background: paper,
                color: ink,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: phone ? "88px 24px 56px" : "120px 32px 72px",
                boxSizing: "border-box",
                textAlign: "center",
                position: "relative",
            }}
        >
            <div style={{ ...fade(0), ...small, position: "absolute", left: phone ? 24 : 40, top: phone ? 32 : 48 }}>(Thank you)</div>

            <div
                style={{
                    ...fade(0.2),
                    fontFamily: serif,
                    fontStyle: "italic",
                    fontWeight: 400,
                    fontSize: phone ? 76 : 148,
                    lineHeight: 0.95,
                    letterSpacing: "-0.02em",
                }}
            >
                {word}
            </div>

            <h1 style={{ ...fade(0.9), fontFamily: mincho, fontWeight: 400, fontSize: phone ? 19 : 22, letterSpacing: "0.12em", lineHeight: 1.7, margin: phone ? "40px 0 0" : "52px 0 0", wordBreak: "keep-all", overflowWrap: "anywhere" }}>
                {title}
            </h1>
            <p style={{ ...fade(1.4), fontFamily: gothic, fontSize: 13, lineHeight: 2.2, letterSpacing: "0.05em", margin: "28px 0 0", whiteSpace: "pre-line" }}>
                {body}
            </p>

            <div style={{ ...fade(2.4), width: 1, height: phone ? 40 : 56, background: `${ink}55`, margin: phone ? "36px 0" : "44px 0" }} />

            <p style={{ ...fade(2.8), fontFamily: mincho, fontSize: phone ? 14 : 15, lineHeight: 2, letterSpacing: "0.1em", margin: 0, minHeight: "2em", whiteSpace: "pre-line" }}>
                {hourLine}
            </p>

            <div style={{ ...fade(3.4), marginTop: phone ? 56 : 72, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                {ref ? <div style={small}>ご注文番号の末尾 — <span style={{ fontFamily: serif, fontSize: 14, color: ink, letterSpacing: "0.08em" }}>{ref}</span></div> : null}
                {email ? (
                    <div style={{ ...small, lineHeight: 1.9 }}>
                        お届けについてのご相談は{" "}
                        <a href={`mailto:${email}`} style={{ fontFamily: serif, fontSize: 15, color: ink, textDecoration: "none", borderBottom: `1px solid ${ink}44`, letterSpacing: "0.01em" }}>
                            {email}
                        </a>
                    </div>
                ) : null}
                <div style={{ fontFamily: gothic, fontSize: 12, letterSpacing: "0.05em", marginTop: 6 }}>20歳未満の者の飲酒は法律で禁止されています。</div>
            </div>

            <a href={backHref} style={{ ...fade(3.8), fontFamily: serif, fontStyle: "italic", fontSize: 17, color: ink, marginTop: phone ? 48 : 56, textDecoration: "none" }}>
                ← Yohaku Lab.
            </a>
        </div>
    )
}

YohakuThanks.defaultProps = {
    word: "Thank you.",
    title: "ご注文を、たしかにお受けしました。",
    body: "確認のメールを、Square からお送りしています。\n瓶はひとつずつ包み、数日のうちに発送いたします。\n届くまでの数日も、余白のひとつとして。",
    morning: "封を切るのは、どうぞ日が暮れてから。",
    afternoon: "今日の午後が、静かにほどけていきますように。",
    evening: "よい夜を。\nグラスに氷をひとつ落とす、その音から。",
    night: "遅くまで、ありがとうございました。\n今夜は、ゆっくりお休みください。",
    email: "yohaku.ohba@gmail.com",
    backHref: "/",
    paper: "#F7F7F5",
    ink: "#111111",
    mute: "#8C8B87",
}

addPropertyControls(YohakuThanks, {
    word: { type: ControlType.String, title: "Word" },
    title: { type: ControlType.String, title: "Title" },
    body: { type: ControlType.String, title: "Body", displayTextArea: true },
    morning: { type: ControlType.String, title: "Morning 5–11", displayTextArea: true },
    afternoon: { type: ControlType.String, title: "Afternoon 11–17", displayTextArea: true },
    evening: { type: ControlType.String, title: "Evening 17–23", displayTextArea: true },
    night: { type: ControlType.String, title: "Night 23–5", displayTextArea: true },
    email: { type: ControlType.String, title: "Contact email" },
    backHref: { type: ControlType.String, title: "Back link" },
    paper: { type: ControlType.Color, title: "Paper" },
    ink: { type: ControlType.Color, title: "Ink" },
    mute: { type: ControlType.Color, title: "Mute" },
})
