import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/session'

export async function GET() {
  return NextResponse.json({ authorized: await isAdminRequest() })
}
