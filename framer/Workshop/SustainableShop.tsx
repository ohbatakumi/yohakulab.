import { useState, startTransition, type CSSProperties } from "react"
import { addPropertyControls, ControlType } from "framer"

/**
 * 余白研究室 — 品々 (Objects)
 * 白と黒のミニマムな商品リスト。スマホでは一列、広い画面では二〜三列。
 * 既存の「サスティナブルショップ」と同じプロパティ名を保つので、入力済みの商品はそのまま残る。
 *
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 600
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */

const FONT_HREF =
    "https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400&family=Zen+Kaku+Gothic+New:wght@400&display=swap"
const MINCHO = `"Shippori Mincho", serif`
const GOTHIC = `"Zen Kaku Gothic New", sans-serif`

function ensureFonts() {
    if (typeof document === "undefined") return
    if (document.querySelector("link[data-yohaku-fonts]")) return
    const l = document.createElement("link")
    l.rel = "stylesheet"
    l.href = FONT_HREF
    l.setAttribute("data-yohaku-fonts", "")
    document.head.appendChild(l)
}

interface Product {
    id?: string
    name?: string
    price?: string
    description?: string
    image?: { src: string; alt?: string } | string
    link?: string
}

interface Props {
    title?: string
    textColor?: string
    mutedColor?: string
    lineColor?: string
    products?: Product[]
    style?: CSSProperties
}

const FALLBACK_IMG = "https://framerusercontent.com/images/aNsAT3jCvt4zglbWCUoFe33Q.jpg"

function srcOf(img: Product["image"]) {
    if (!img) return ""
    return typeof img === "string" ? img : img.src
}

function realLink(href?: string) {
    if (!href) return ""
    if (/example\.com/i.test(href)) return ""
    return href
}

export default function SustainableShop(props: Props) {
    const {
        title = "",
        textColor = "#111111",
        mutedColor = "#8C8B87",
        lineColor = "rgba(17,17,17,0.14)",
        products = [],
        style,
    } = props
    ensureFonts()

    return (
        <div style={{ width: "100%", ...style }}>
            {title ? (
                <p
                    style={{
                        margin: "0 0 28px",
                        paddingBottom: 14,
                        borderBottom: `1px solid ${lineColor}`,
                        fontFamily: GOTHIC,
                        fontSize: 11,
                        letterSpacing: "0.1em",
                        lineHeight: 1.7,
                        color: mutedColor,
                    }}
                >
                    {title}
                </p>
            ) : null}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
                    columnGap: 32,
                    rowGap: 64,
                }}
            >
                {products.map((p, i) => (
                    <Item
                        key={p.id || i}
                        product={p}
                        index={i}
                        textColor={textColor}
                        mutedColor={mutedColor}
                        lineColor={lineColor}
                    />
                ))}
            </div>
        </div>
    )
}

function Item({
    product,
    index,
    textColor,
    mutedColor,
    lineColor,
}: {
    product: Product
    index: number
    textColor: string
    mutedColor: string
    lineColor: string
}) {
    const [hover, setHover] = useState(false)
    const src = srcOf(product.image) || FALLBACK_IMG
    const href = realLink(product.link)
    const Wrap: any = href ? "a" : "div"

    return (
        <Wrap
            {...(href ? { href, target: "_blank", rel: "noopener noreferrer" } : {})}
            onMouseEnter={() => startTransition(() => setHover(true))}
            onMouseLeave={() => startTransition(() => setHover(false))}
            style={{
                display: "block",
                color: textColor,
                textDecoration: "none",
                cursor: href ? "pointer" : "default",
            }}
        >
            <div
                style={{
                    width: "100%",
                    aspectRatio: "4 / 5",
                    overflow: "hidden",
                    background: "rgba(17,17,17,0.04)",
                }}
            >
                <img
                    src={src}
                    alt={(typeof product.image === "object" && product.image?.alt) || product.name || ""}
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
            </div>
            <div
                style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 16,
                    marginTop: 18,
                    paddingBottom: 12,
                    borderBottom: `1px solid ${lineColor}`,
                }}
            >
                <span style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                    <span
                        style={{
                            fontFamily: GOTHIC,
                            fontSize: 10,
                            letterSpacing: "0.1em",
                            color: mutedColor,
                            fontVariantNumeric: "tabular-nums",
                        }}
                    >
                        {String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                        style={{
                            fontFamily: MINCHO,
                            fontSize: 17,
                            letterSpacing: "0.08em",
                            lineHeight: 1.5,
                        }}
                    >
                        {product.name}
                    </span>
                </span>
                {product.price ? (
                    <span
                        style={{
                            fontFamily: GOTHIC,
                            fontSize: 12,
                            letterSpacing: "0.06em",
                            color: mutedColor,
                            fontVariantNumeric: "tabular-nums",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {product.price}
                    </span>
                ) : null}
            </div>
            {product.description ? (
                <p
                    style={{
                        margin: "14px 0 0",
                        fontFamily: GOTHIC,
                        fontSize: 12.5,
                        lineHeight: 2.1,
                        letterSpacing: "0.05em",
                        color: textColor,
                        opacity: 0.82,
                    }}
                >
                    {product.description}
                </p>
            ) : null}
            {href ? (
                <span
                    style={{
                        display: "inline-block",
                        marginTop: 14,
                        fontFamily: GOTHIC,
                        fontSize: 11,
                        letterSpacing: "0.1em",
                        color: textColor,
                        borderBottom: `1px solid ${hover ? textColor : lineColor}`,
                        paddingBottom: 3,
                        transition: "border-color .6s ease",
                    }}
                >
                    オンラインストアへ
                </span>
            ) : null}
        </Wrap>
    )
}

addPropertyControls(SustainableShop, {
    title: { type: ControlType.String, title: "Title", defaultValue: "" },
    textColor: { type: ControlType.Color, title: "Text", defaultValue: "#111111" },
    mutedColor: { type: ControlType.Color, title: "Muted", defaultValue: "#8C8B87" },
    lineColor: { type: ControlType.Color, title: "Line", defaultValue: "rgba(17,17,17,0.14)" },
    products: {
        type: ControlType.Array,
        title: "商品",
        maxCount: 9,
        control: {
            type: ControlType.Object,
            controls: {
                id: { type: ControlType.String, title: "ID", defaultValue: "1" },
                name: { type: ControlType.String, title: "商品名", defaultValue: "商品名" },
                price: { type: ControlType.String, title: "価格", defaultValue: "" },
                description: {
                    type: ControlType.String,
                    title: "説明文",
                    defaultValue: "",
                    displayTextArea: true,
                },
                image: { type: ControlType.ResponsiveImage, title: "商品画像" },
                link: { type: ControlType.Link, title: "購入リンク" },
            },
        },
    },
})

SustainableShop.displayName = "Yohaku Objects"
