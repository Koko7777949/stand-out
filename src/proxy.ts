import { NextResponse, type NextRequest } from 'next/server'

// لينكات الدعوة الشخصية — نفس فكرة الموقع المرجعي:
// /i/{كود الإحالة} → الصفحة الرئيسية بكود الإحالة
// اللينك بيفضل شكل حلو في عنوان المتصفح، والكود بيتلقط في الصفحة
export function proxy(req: NextRequest) {
  const m = req.nextUrl.pathname.match(/^\/i\/([A-Za-z0-9]{4,16})\/?$/)
  if (m) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('ref', m[1].toUpperCase())
    return NextResponse.rewrite(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/i/:path*'],
}
