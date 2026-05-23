import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const authorized = cookieStore.get('vibe_admin')?.value === '1'
  return NextResponse.json({ authorized })
}
