import { useState, startTransition, type CSSProperties } from "react"
import { addPropertyControls, ControlType } from "framer"

/**
 * 余白研究室 — ほかの入口のカード（CMS の各項目に紐づけて使う）
 *
 * @framerIntrinsicWidth 360
 * @framerIntrinsicHeight 320
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */

const FONT_HREF =
    "https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400&family=Zen+Kaku+Gothic+New:wght@400&display=swap"

function ensureFonts() {
    if (typeof document === "undefined") return
    if (document.querySelector("link[data-yohaku-fonts]")) return
    const l = document.createElement("link")
    l.rel = "stylesheet"
    l.href = FONT_HREF
    l.setAttribute("data-yohaku-fonts", "")
    document.head.appendChild(l)
}

type Props = {
    image?: { src: string; alt?: string } | string
    name?: string
    kind?: string
    ratio?: number
    caption?: boolean
    style?: CSSProperties
}

export default function YohakuProjectCard(props: Props) {
    const { image, name = "余白研究室", kind = "", ratio = 1.4, caption = true, style } = props
    const [hover, setHover] = useState(false)
    ensureFonts()
    const src = !image ? "" : typeof image === "string" ? image : image.src
    // "言葉の記録/article" → 和名と欧文に分けて、欧文を小さく添える
    const [ja, en] = splitName(name)

    return (
        <div
            onMouseEnter={() => startTransition(() => setHover(true))}
            onMouseLeave={() => startTransition(() => setHover(false))}
            style={{ width: "100%", color: "#111111", ...style }}
        >
            <div
                style={{
                    width: "100%",
                    aspectRatio: String(ratio),
                    overflow: "hidden",
                    background: "rgba(17,17,17,0.05)",
                }}
            >
                {src ? (
                    <img
                        src={src}
                        alt={name}
                        loading="lazy"
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                            transform: hover ? "scale(1.03)" : "scale(1)",
                            transition: "transform 1.2s cubic-bezier(.2,.7,.2,1)",
                        }}
                    />
                ) : null}
            </div>
            {caption ? (
            <div
                style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 12,
                    marginTop: 14,
                }}
            >
                <span style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0 }}>
                    <span
                        style={{
                            fontFamily: `"Shippori Mincho", serif`,
                            fontSize: 16,
                            letterSpacing: "0.08em",
                            lineHeight: 1.5,
                            whiteSpace: "nowrap",
                        }}
                    >
                        {ja}
                    </span>
                    {en ? (
                        <span
                            style={{
                                fontFamily: `"Instrument Serif", serif`,
                                fontStyle: "italic",
                                fontSize: 13,
                                color: "#8C8B87",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {en}
                        </span>
                    ) : null}
                </span>
                <span
                    style={{
                        fontFamily: `"Zen Kaku Gothic New", sans-serif`,
                        fontSize: 11,
                        letterSpacing: "0.1em",
                        color: hover ? "#111111" : "#8C8B87",
                        transition: "color .6s ease",
                        whiteSpace: "nowrap",
                    }}
                >
                    {kind ? kind : "→"}
                </span>
            </div>
            ) : null}
        </div>
    )
}

function splitName(name: string): [string, string] {
    const m = name.split(/\s*\/\s*/)
    if (m.length >= 2) {
        const en = m.slice(1).join(" / ").trim()
        return [m[0].trim(), en.charAt(0).toUpperCase() + en.slice(1)]
    }
    return [name, ""]
}

addPropertyControls(YohakuProjectCard, {
    image: { type: ControlType.ResponsiveImage, title: "Image" },
    name: { type: ControlType.String, title: "Name", defaultValue: "余白研究室" },
    kind: { type: ControlType.String, title: "Kind", defaultValue: "" },
    caption: { type: ControlType.Boolean, title: "Caption", defaultValue: true },
    ratio: { type: ControlType.Number, title: "Ratio", defaultValue: 1.4, min: 0.5, max: 2, step: 0.05 },
})

YohakuProjectCard.displayName = "Yohaku Project Card"
