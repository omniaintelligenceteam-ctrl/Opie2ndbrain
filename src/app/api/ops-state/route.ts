import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OPS_STATE_ID = 'primary';

function isStatePayload(value: any): value is { todos: unknown[]; events: unknown[]; urgencyColumns: unknown[] } {
  return Boolean(
    value &&
      Array.isArray(value.todos) &&
      Array.isArray(value.events) &&
      Array.isArray(value.urgencyColumns),
  );
}

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('opie_ops_state')
    .select('payload, updated_at')
    .eq('id', OPS_STATE_ID)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    state: data?.payload || null,
    updatedAt: data?.updated_at || null,
  });
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured' }, { status: 503 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!isStatePayload(body?.state)) {
    return NextResponse.json(
      { ok: false, error: 'Expected { state: { todos: [], events: [], urgencyColumns: [] } }' },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from('opie_ops_state')
    .upsert(
      {
        id: OPS_STATE_ID,
        payload: body.state,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: 'id' },
    );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
