// تركيب صورة التذكرة كاملة على canvas — للتحميل PNG و PDF (A5 landscape)
// Arabic text needs RTL shaping — canvas handles it via browser text engine
export type TicketDrawData = {
  serial: string
  holderName: string
  holderAge: number
  governorate: string
  issuedAt: string
  eventName: string
  startsAt: string
  venue: string
  city: string
  qrPng: string // data URL
}

const W = 1400
const H = 990

export async function renderTicketCanvas(t: TicketDrawData): Promise<HTMLCanvasElement> {
  try {
    await (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts?.ready
  } catch { /* ignore */ }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  if ('direction' in ctx) (ctx as unknown as { direction: string }).direction = 'rtl'

  // الخلفية
  ctx.fillStyle = '#FAF3E8'
  ctx.fillRect(0, 0, W, H)

  // شريط ليموني جانبي
  ctx.fillStyle = '#C6DA91'
  ctx.fillRect(0, 0, 14, H)

  // إطار داخلي خفيف
  ctx.strokeStyle = 'rgba(33,20,52,0.16)'
  ctx.lineWidth = 2
  ctx.strokeRect(60, 60, W - 120, H - 120)

  // ---- الرأس ----
  ctx.textBaseline = 'alphabetic'
  ctx.direction = 'ltr'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#211434'
  ctx.font = '800 84px "Bricolage Grotesque", "Cairo", sans-serif'
  ctx.fillText('SO ★', 100, 170)
  ctx.fillStyle = '#7B3FF2'
  ctx.font = '800 84px "Bricolage Grotesque", "Cairo", sans-serif'
  ctx.fillText('26', 320, 170)

  ctx.direction = 'rtl'
  ctx.textAlign = 'right'
  ctx.fillStyle = '#6D5F80'
  ctx.font = '700 30px "Cairo", sans-serif'
  ctx.fillText('مبادرة Stand Out — مسار', W - 100, 130)
  ctx.fillStyle = '#211434'
  ctx.font = '800 34px "Cairo", sans-serif'
  ctx.fillText(t.eventName, W - 100, 176)

  // خط فاصل
  ctx.strokeStyle = 'rgba(33,20,52,0.5)'
  ctx.lineWidth = 3
  ctx.setLineDash([14, 10])
  ctx.beginPath()
  ctx.moveTo(100, 215)
  ctx.lineTo(W - 100, 215)
  ctx.stroke()
  ctx.setLineDash([])

  // ---- بيانات الحضور ----
  ctx.direction = 'rtl'
  ctx.textAlign = 'right'
  const info: [string, string][] = [
    ['الاسم', t.holderName],
    ['السن', String(t.holderAge)],
    ['المحافظة', t.governorate],
    ['التاريخ والمكان', `${dateAr(t.startsAt)} — ${t.venue}، ${t.city}`],
    ['صادرة بتاريخ', t.issuedAt],
  ]
  let y = 290
  for (const [k, v] of info) {
    ctx.fillStyle = '#6D5F80'
    ctx.font = '600 26px "Cairo", sans-serif'
    ctx.fillText(k, W - 620, y)
    ctx.fillStyle = '#211434'
    ctx.font = '800 34px "Cairo", sans-serif'
    ctx.fillText(v, W - 100, y)
    y += 78
  }

  // ---- خانة التسلسل ----
  ctx.direction = 'ltr'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#6D5F80'
  ctx.font = '600 24px "Courier Prime", monospace'
  ctx.fillText('SERIAL', 100, 300)
  ctx.fillStyle = '#211434'
  ctx.font = '700 46px "Courier Prime", monospace'
  ctx.fillText(t.serial, 100, 352)

  // ---- الـ QR ----
  const qrSize = 380
  const qx = 100
  const qy = H - qrSize - 120
  ctx.fillStyle = '#FFFFFF'
  const r = 24
  roundRect(ctx, qx - 20, qy - 20, qrSize + 40, qrSize + 40, r)
  ctx.fill()
  ctx.strokeStyle = '#211434'
  ctx.lineWidth = 6
  roundRect(ctx, qx - 20, qy - 20, qrSize + 40, qrSize + 40, r)
  ctx.stroke()
  await drawImageCentered(ctx, t.qrPng, qx, qy, qrSize, qrSize)

  ctx.direction = 'rtl'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#6D5F80'
  ctx.font = '600 22px "Cairo", sans-serif'
  ctx.fillText('امسح الكود عند البوابة', qx + qrSize / 2, qy + qrSize + 34)

  // ---- التذييل ----
  ctx.direction = 'ltr'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#211434'
  ctx.font = '800 34px "Bricolage Grotesque", "Cairo", sans-serif'
  ctx.fillText('STAND OUT ★ 2026', W / 2, H - 92)
  ctx.fillStyle = '#6D5F80'
  ctx.font = '600 20px "Cairo", sans-serif'
  ctx.direction = 'rtl'
  ctx.fillText('التذكرة شخصية — أول مسح للاستخدام، والاستخدام المتكرر بيتعرض للرفض', W / 2, H - 56)

  return canvas
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawImageCentered(ctx: CanvasRenderingContext2D, src: string, x: number, y: number, w: number, h: number) {
  return new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, x, y, w, h)
      resolve()
    }
    img.onerror = reject
    img.src = src
  })
}

function dateAr(iso: string): string {
  const d = new Date(iso)
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export async function downloadTicketPng(t: TicketDrawData, filename: string) {
  const canvas = await renderTicketCanvas(t)
  const url = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}

export async function downloadTicketPdf(t: TicketDrawData, filename: string) {
  const canvas = await renderTicketCanvas(t)
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' })
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 148.6)
  pdf.save(filename)
}
