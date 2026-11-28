// 特定商取引法に基づく表記 / 酒類販売管理者標識 / お届けについて — for the /legal page.
// Every value is a flat prop so it can be edited in Framer's panel. Values that still start
// with 【 are unfilled and are drawn in the accent colour so they cannot be missed.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"


// Framer hands colours over as "rgb(r, g, b)", so alpha is applied here rather than by appending hex digits.
function tint(c: string, hex: string) {
    const a = parseInt(hex, 16) / 255
    const m = String(c).match(/rgba?\(([^)]+)\)/)
    if (m) {
        const [r, g, b] = m[1].split(",").map((v) => parseFloat(v))
        return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`
    }
    if (/^#[0-9a-f]{6}$/i.test(c)) return c + hex
    return c
}

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

const NOTES: [string, string][] = [
    ["noteAlcohol", "酒類販売に関する注意事項"],
    ["noteQuantity", "販売数量について"],
    ["noteStorage", "受取・保管について"],
    ["noteDisclaimer", "免責事項"],
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
                        borderTop: `1px solid ${tint(mute, "40")}`,
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
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "18px 0", borderTop: `1px solid ${tint(mute, "40")}`, fontFamily: gothic, fontSize: 13.5 }}>
                                <dt>{l}</dt>
                                <dd style={{ margin: 0 }}>¥{f}</dd>
                            </div>
                        ))}
                </dl>
                <p style={{ fontFamily: gothic, fontSize: 12.5, lineHeight: 2, color: ink, marginTop: 18, whiteSpace: "pre-line" }}>{props.deliveryNote}</p>

                {heading("Notes", "ご購入にあたって")}
                {rows(NOTES.filter(([k]) => props[k]))}

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
    seller: "余白Lab.（大庭拓海）",
    manager: "大庭拓海",
    address: "長野県長野市松代温泉303",
    phone: "ご請求があった場合には、遅滞なく開示いたします。\nお問い合わせはメールにて承ります。",
    email: "yohaku.ohba@gmail.com",
    priceNote: "各商品ページに表示された価格（税込）に基づきます。\nYohaku no Niwa GIN　¥7,200（税込）",
    fees: "送料（下記「お届けと送料」のとおり）\n銀行振込の場合の振込手数料は、お客様のご負担となります。",
    payment: "クレジットカード等（Square の決済方法に準ずる）\n銀行振込（メールでのご注文の場合）",
    paymentTime: "クレジットカード：ご注文確定時にお支払いが確定します。\n銀行振込：ご注文後にメールでお送りする振込先のご案内に従い、お振込みください。ご入金を確認してから発送いたします。",
    delivery: "通常、ご注文確定後 2〜7営業日以内に発送いたします。\n年齢確認や決済状況により、発送が遅れる場合があります。\n天候・交通事情・配送業者の都合により、到着が遅延する場合があります。\n配送日時指定は確約するものではありません。",
    returns: "商品の特性上、お客様都合による返品・交換はお受けしておりません。\n万一、破損・誤配送があった場合は、商品到着後7日以内にご連絡ください。\n上記期間を過ぎた場合、対応いたしかねる場合があります。",
    cancel: "発送前に限り、メールにてご連絡いただければ取消を承ります。\n虚偽の申告が判明した場合、ご注文をキャンセルさせていただきます。\n通信販売のため、クーリング・オフの対象にはなりません。",
    age: "ご注文時に年齢確認を行っております。\n必要に応じて身分証の提示をお願いする場合があります。\n年齢確認が完了するまで商品は発送されません。",
    license: "通信販売酒類小売業免許\n【所轄税務署名】 【免許番号】",
    regionALabel: "本州・四国・九州",
    regionAFee: "1,000",
    regionBLabel: "北海道・沖縄・離島",
    regionBFee: "1,800",
    deliveryNote: "国内のみのお届けです。瓶の商品のため、緩衝材で包んでお送りします。\nお選びいただいた地域とお届け先が異なる場合は、差額についてご連絡いたします。",
    noteAlcohol: "当店は酒類販売業免許を取得した事業者です。\n20歳未満の者への酒類の販売は法律により禁止されています。\n年齢確認ができない場合は、商品の発送をお断りする場合があります。\n妊娠中・授乳期の飲酒は胎児・乳児の発育に悪影響を与えるおそれがあります。\n飲酒運転は法律で禁止されています。",
    noteQuantity: "販売数量には制限を設ける場合があります。\n転売目的と判断した場合、ご注文をお断りする場合があります。",
    noteStorage: "商品到着後は速やかに状態をご確認ください。\n高温・直射日光を避け、適切な環境で保管してください。\n開封後の品質変化については責任を負いかねます。",
    noteDisclaimer: "商品の風味・香り・色合いには個体差があります。\nお客様の嗜好による返品はお受けできません。\n当店は商品の使用・飲用により生じたいかなる損害についても責任を負いかねます（法令に定める場合を除く）。",
    signPlace: "余白Lab.\n長野県長野市松代温泉303",
    signManager: "大庭拓海",
    signTrained: "2026年4月13日",
    signNext: "2029年4月12日",
    signOrg: "全国小売酒販組合中央会",
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
    noteAlcohol: str("注意 酒類販売", true),
    noteQuantity: str("注意 販売数量", true),
    noteStorage: str("注意 受取・保管", true),
    noteDisclaimer: str("注意 免責", true),
    backHref: str("戻るリンク"),
    paper: { type: ControlType.Color, title: "Paper" },
    ink: { type: ControlType.Color, title: "Ink" },
    mute: { type: ControlType.Color, title: "Mute" },
    alert: { type: ControlType.Color, title: "未入力の色" },
})
