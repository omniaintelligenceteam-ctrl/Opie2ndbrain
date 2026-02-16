import { NextResponse } from 'next/server'
import { listAvatars, getAvatar, HEYGEN_CONFIGURED } from '@/lib/heygen'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (!HEYGEN_CONFIGURED) {
      return NextResponse.json({
        success: true,
        data: { avatars: [], defaultAvatar: null, configured: false },
        timestamp: new Date().toISOString(),
      })
    }

    const avatars = await listAvatars()
    const defaultAvatar = await getAvatar()

    return NextResponse.json({
      success: true,
      data: { avatars, defaultAvatar, configured: true },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[HeyGen Avatars] Error:', error)
    return NextResponse.json({
      success: true,
      data: { avatars: [], defaultAvatar: null, configured: HEYGEN_CONFIGURED },
      error: error instanceof Error ? error.message : 'Failed to fetch avatars',
      timestamp: new Date().toISOString(),
    })
  }
}
