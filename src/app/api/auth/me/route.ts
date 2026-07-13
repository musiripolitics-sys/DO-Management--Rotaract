import { NextResponse } from 'next/server'
import {
  getSession,
  dashboardForRole,
  hasAccess,
  ADMIN_TIER,
  MOM_TIER,
  PROJECTS_TIER,
  SCAN_TIER,
  SERGEANT_MANAGE_TIER,
  OVERSIGHT_TIER,
} from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  const s = await getSession()
  if (!s) {
    return NextResponse.json({ authenticated: false, role: null, dashboard: null })
  }
  return NextResponse.json({
    authenticated: true,
    role: s.role,
    name: s.fullName,
    dashboard: dashboardForRole(s.role),
    canAdmin: hasAccess(s.role, ADMIN_TIER),
    canMom: hasAccess(s.role, MOM_TIER),
    canProjects: hasAccess(s.role, PROJECTS_TIER),
    canScan: hasAccess(s.role, SCAN_TIER),
    canManageSergeants: hasAccess(s.role, SERGEANT_MANAGE_TIER),
    canOversee: hasAccess(s.role, OVERSIGHT_TIER),
  })
}
