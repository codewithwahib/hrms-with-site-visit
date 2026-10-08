// app/api/driver/location/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------- POST: Driver sends location ----------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.van_id || !UUID_RE.test(body.van_id)) {
      return NextResponse.json(
        { error: 'Valid van_id is required.' },
        { status: 400 }
      );
    }

    const lat = Number(body.latitude);
    const lng = Number(body.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return NextResponse.json({ error: 'Invalid latitude.' }, { status: 400 });
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Invalid longitude.' },
        { status: 400 }
      );
    }

    const driverId =
      body.driver_id && UUID_RE.test(body.driver_id) ? body.driver_id : null;

    const now = new Date().toISOString();

    const { error } = await supabase.from('van_live_state').upsert(
      {
        van_id: body.van_id,
        driver_id: driverId,
        latitude: lat,
        longitude: lng,
        speed: body.speed ?? null,
        heading: body.heading ?? null,
        accuracy: body.accuracy ?? null,
        is_online: true,
        last_ping_at: now,
        updated_at: now,
      },
      { onConflict: 'van_id' }
    );

    if (error) {
      console.error('🔴 Upsert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, at: now }, { status: 200 });
  } catch (err) {
    console.error('🔴 POST error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

// ---------- DELETE: Mark offline ----------
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const vanId = body.van_id;

    if (!vanId || !UUID_RE.test(vanId)) {
      return NextResponse.json(
        { error: 'Valid van_id required.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('van_live_state')
      .update({ is_online: false, updated_at: new Date().toISOString() })
      .eq('van_id', vanId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('🔴 DELETE error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

// ---------- GET: List all live vans ----------
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('van_live_state')
      .select('*')
      .eq('is_online', true)
      .order('last_ping_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter out stale (>2 min)
    const cutoff = Date.now() - 2 * 60 * 1000;
    const live = (data || []).filter(
      (v) => new Date(v.last_ping_at).getTime() > cutoff
    );

    return NextResponse.json({ vans: live }, { status: 200 });
  } catch (err) {
    console.error('🔴 GET error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}