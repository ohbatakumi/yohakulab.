// /thanks — where Square returns the buyer after payment. Quiet, and short.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

const FONT_HREF =
    "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Shippori+Mincho:wght@400&family=Zen+Kaku+Gothic+New:wght@400&display=swap"

function ensureFonts() {
    if (typeof document === "undefined") return
    if (document.querySelector("link[data-yohaku-gin]")) return
    const l = document.createElement("link")
    l.rel = "stylesheet"
    l.href = FONT_HREF
    l.setAttribute("data-yohaku-gin", "")
    document.head.appendChild(l)
}

type Props = { title: string; body: string; backHref: string; paper: string; ink: string; mute: string; style?: React.CSSProperties }

export default function YohakuThanks(props: Props) {
    const { title, body, backHref, paper, ink, mute } = props
    const [shown, setShown] = React.useState(false)
    React.useEffect(() => {
        ensureFonts()
        const t = setTimeout(() => setShown(true), 200)
        return () => clearTimeout(t)
    }, [])
    const fade = (delay: number): React.CSSProperties => ({
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(6px)",
        transition: `opacity 1.6s ease ${delay}s, transform 1.6s ease ${delay}s`,
    })
    return (
        <div
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
                padding: "48px 24px",
                boxSizing: "border-box",
                textAlign: "center",
            }}
        >
            <div style={{ ...fade(0), fontFamily: `"Cormorant Garamond", serif`, fontStyle: "italic", fontWeight: 300, fontSize: 18, color: mute }}>
                (Thank you)
            </div>
            <h1 style={{ ...fade(0.4), fontFamily: `"Shippori Mincho", serif`, fontWeight: 400, fontSize: 22, letterSpacing: "0.12em", margin: "18px 0 0" }}>{title}</h1>
            <p style={{ ...fade(0.9), fontFamily: `"Zen Kaku Gothic New", sans-serif`, fontSize: 13, lineHeight: 2.1, letterSpacing: "0.05em", marginTop: 28, whiteSpace: "pre-line" }}>
                {body}
            </p>
            <p style={{ ...fade(1.3), fontFamily: `"Zen Kaku Gothic New", sans-serif`, fontSize: 13, letterSpacing: "0.05em", marginTop: 40 }}>
                20歳未満の者の飲酒は法律で禁止されています。
            </p>
            <a href={backHref} style={{ ...fade(1.6), fontFamily: `"Cormorant Garamond", serif`, fontStyle: "italic", fontSize: 16, color: ink, marginTop: 64, textDecoration: "none" }}>
                ← Yohaku Lab.
            </a>
        </div>
    )
}

YohakuThanks.defaultProps = {
    title: "ご注文、ありがとうございました。",
    body: "ご注文の確認メールをお送りしました。\n整いしだい、静かにお届けいたします。",
    backHref: "/",
    paper: "#F7F7F5",
    ink: "#111111",
    mute: "#8C8B87",
}

addPropertyControls(YohakuThanks, {
    title: { type: ControlType.String, title: "Title" },
    body: { type: ControlType.String, title: "Body", displayTextArea: true },
    backHref: { type: ControlType.String, title: "Back link" },
    paper: { type: ControlType.Color, title: "Paper" },
    ink: { type: ControlType.Color, title: "Ink" },
    mute: { type: ControlType.Color, title: "Mute" },
})
