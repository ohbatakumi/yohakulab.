// 特定商取引法に基づく表記 / 酒類販売管理者標識 / お届けについて — for the /legal page.
// Every value is a flat prop so it can be edited in Framer's panel. Values that still start
// with 【 are unfilled and are drawn in the accent colour so they cannot be missed.
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

const serif = `"Cormorant Garamond", "Shippori Mincho", serif`
const mincho = `"Shippori Mincho", serif`
const gothic = `"Zen Kaku Gothic New", sans-serif`

type Props = { [k: string]: any; style?: React.CSSProperties }

const SCTA: [string, string][] = [
    ["seller", "販売業者"],
    ["manager", "運営統括責任者"],
    ["address", "所在地"],
    ["phone", "電話番号"],
    ["email", "メールアドレス"],
    ["priceNote", "販売価格"],
    ["fees", "商品代金以外の必要料金"],
    ["payment", "お支払い方法"],
    ["paymentTime", "お支払い時期"],
    ["delivery", "お届け時期"],
    ["returns", "返品・交換"],
    ["cancel", "ご注文の取消"],
    ["age", "年齢の確認"],
    ["license", "酒類販売業免許"],
]

const SIGN: [string, string][] = [
    ["signPlace", "販売場の名称及び所在地"],
    ["signManager", "酒類販売管理者の氏名"],
    ["signTrained", "酒類販売管理研修の受講年月日"],
    ["signNext", "次回研修の受講期限"],
    ["signOrg", "研修実施団体名"],
]

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight auto
 */
export default function YohakuLegal(props: Props) {
    const { paper, ink, mute, alert, backHref } = props
    const hostRef = React.useRef<HTMLDivElement>(null)
    const [w, setW] = React.useState(1200)
    React.useEffect(() => {
        ensureFonts()
        const el = hostRef.current
        if (!el) return
        const ro = new ResizeObserver(() => setW(el.getBoundingClientRect().width))
        ro.observe(el)
        return () => ro.disconnect()
    }, [])
    const phone = w < 760

    const value = (v: string) => {
        const s = String(v || "")
        const unfilled = s.trim().startsWith("【")
        return (
            <span style={{ color: unfilled ? alert : ink, whiteSpace: "pre-line" }}>{s}</span>
        )
    }

    const rows = (list: [string, string][]) => (
        <dl style={{ margin: 0 }}>
            {list.map(([k, label]) => (
                <div
                    key={k}
                    style={{
                        display: "grid",
                        gridTemplateColumns: phone ? "1fr" : "220px 1fr",
                        gap: phone ? 6 : 32,
                        padding: phone ? "18px 0" : "22px 0",
                        borderTop: `1px solid ${mute}40`,
                    }}
                >
                    <dt style={{ fontFamily: gothic, fontSize: 12, color: mute, letterSpacing: "0.1em", lineHeight: 1.9 }}>{label}</dt>
                    <dd style={{ margin: 0, fontFamily: gothic, fontSize: 13.5, lineHeight: 1.95, letterSpacing: "0.03em" }}>{value(props[k])}</dd>
                </div>
            ))}
        </dl>
    )

    const heading = (en: string, ja: string) => (
        <div style={{ marginTop: phone ? 72 : 112, marginBottom: 24 }}>
            <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 15, color: mute }}>({en})</div>
            <h2 style={{ fontFamily: mincho, fontWeight: 400, fontSize: phone ? 18 : 20, letterSpacing: "0.1em", margin: "8px 0 0" }}>{ja}</h2>
        </div>
    )

    return (
        <div
            ref={hostRef}
            style={{
                ...props.style,
                width: "100%",
                minHeight: "100%",
                background: paper,
                color: ink,
                boxSizing: "border-box",
                padding: phone ? "40px 24px 96px" : "56px 40px 160px",
            }}
        >
            <a href={backHref} style={{ fontFamily: serif, fontStyle: "italic", fontSize: 16, color: ink, textDecoration: "none" }}>
                ← Yohaku Lab.
            </a>
            <div style={{ maxWidth: 760, margin: "0 auto" }}>
                <div style={{ marginTop: phone ? 72 : 120 }}>
                    <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 15, color: mute }}>(Legal)</div>
                    <h1 style={{ fontFamily: mincho, fontWeight: 400, fontSize: phone ? 22 : 28, letterSpacing: "0.12em", margin: "10px 0 0" }}>
                        特定商取引法に基づく表記
                    </h1>
                </div>
                <div style={{ marginTop: 40 }}>{rows(SCTA)}</div>

                {heading("Delivery", "お届けと送料")}
                <dl style={{ margin: 0 }}>
                    {[
                        [props.regionALabel, props.regionAFee],
                        [props.regionBLabel, props.regionBFee],
                    ]
                        .filter(([l]) => l)
                        .map(([l, f], i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "18px 0", borderTop: `1px solid ${mute}40`, fontFamily: gothic, fontSize: 13.5 }}>
                                <dt>{l}</dt>
                                <dd style={{ margin: 0 }}>¥{f}</dd>
                            </div>
                        ))}
                </dl>
                <p style={{ fontFamily: gothic, fontSize: 12.5, lineHeight: 2, color: ink, marginTop: 18, whiteSpace: "pre-line" }}>{props.deliveryNote}</p>

                {heading("Notice", "酒類販売管理者標識")}
                {rows(SIGN)}

                <p style={{ fontFamily: gothic, fontSize: 14, letterSpacing: "0.06em", marginTop: phone ? 72 : 112, textAlign: "center" }}>
                    20歳未満の者の飲酒は法律で禁止されています。
                </p>
            </div>
        </div>
    )
}

YohakuLegal.defaultProps = {
    seller: "【屋号または事業者名】",
    manager: "【運営統括責任者の氏名】",
    address: "【販売場の所在地（免許の販売場と同じ住所）】",
    phone: "【電話番号】\n受付時間 【例 平日 10:00–17:00】",
    email: "【メールアドレス】",
    priceNote: "商品ページに税込価格で表示しています。",
    fees: "送料（下記「お届けと送料」のとおり）",
    payment: "クレジットカード（Square の決済画面にてお支払いいただきます）",
    paymentTime: "ご注文時にお支払いが確定します。",
    delivery: "ご注文の確認後、【5】営業日以内に発送いたします。",
    returns:
        "商品の性質上、お客さまのご都合による返品・交換はお受けしておりません。\n破損・不良品の場合は、商品到着後7日以内にご連絡ください。当方の送料負担にて交換または返金いたします。",
    cancel: "発送前に限り、メールにてご連絡いただければ取消を承ります。\n通信販売のため、クーリング・オフの対象にはなりません。",
    age: "20歳未満の方には酒類を販売いたしません。ご注文の際に生年月日を確認しています。",
    license: "通信販売酒類小売業免許\n【所轄税務署名】 【免許番号】",
    regionALabel: "本州・四国・九州",
    regionAFee: "1,100",
    regionBLabel: "北海道・沖縄・離島",
    regionBFee: "1,800",
    deliveryNote:
        "国内のみのお届けです。瓶の商品のため、緩衝材で包んでお送りします。\nお選びいただいた地域とお届け先が異なる場合は、差額についてご連絡いたします。",
    signPlace: "【販売場の名称】\n【販売場の所在地】",
    signManager: "【酒類販売管理者の氏名】",
    signTrained: "【例 2026年1月15日】",
    signNext: "【例 2029年1月14日】",
    signOrg: "【研修実施団体名】",
    backHref: "/",
    paper: "#F7F7F5",
    ink: "#111111",
    mute: "#8C8B87",
    alert: "#AE3B27",
}

const str = (title: string, multi = false) => ({ type: ControlType.String, title, displayTextArea: multi })

addPropertyControls(YohakuLegal, {
    seller: str("販売業者"),
    manager: str("運営統括責任者"),
    address: str("所在地", true),
    phone: str("電話番号", true),
    email: str("メール"),
    priceNote: str("販売価格", true),
    fees: str("必要料金", true),
    payment: str("支払方法", true),
    paymentTime: str("支払時期", true),
    delivery: str("お届け時期", true),
    returns: str("返品・交換", true),
    cancel: str("取消", true),
    age: str("年齢の確認", true),
    license: str("免許", true),
    regionALabel: str("地域A"),
    regionAFee: str("地域A 送料"),
    regionBLabel: str("地域B"),
    regionBFee: str("地域B 送料"),
    deliveryNote: str("お届けの注記", true),
    signPlace: str("標識 販売場", true),
    signManager: str("標識 管理者"),
    signTrained: str("標識 受講日"),
    signNext: str("標識 次回期限"),
    signOrg: str("標識 研修団体"),
    backHref: str("戻るリンク"),
    paper: { type: ControlType.Color, title: "Paper" },
    ink: { type: ControlType.Color, title: "Ink" },
    mute: { type: ControlType.Color, title: "Mute" },
    alert: { type: ControlType.Color, title: "未入力の色" },
})
