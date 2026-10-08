// app/api/admin/routes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type StopPayload =
  | string
  | { name?: string; stop?: string; lat?: number | null; lng?: number | null };

type RoutePayload = {
  route_id: string;
  route_name: string;
  starting_point: string;
  starting_latitude?: number | null;
  starting_longitude?: number | null;
  ending_point: string;
  ending_latitude?: number | null;
  ending_longitude?: number | null;
  all_stops?: StopPayload[];
  stop_timings?: string[];
  assigned_van_id?: string | null;
  assigned_driver_id?: string | null;
  status?: 'active' | 'inactive';
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const parseCoord = (val: unknown): number | null => {
  if (val === undefined || val === null || val === '') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
};

const isValidLat = (n: number | null) => n === null || (n >= -90 && n <= 90);
const isValidLng = (n: number | null) => n === null || (n >= -180 && n <= 180);

// ✅ Normalize all_stops → array of {name, lat, lng}
const normalizeStops = (arr: unknown) => {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((s: any) => {
      if (typeof s === 'string') {
        const name = s.trim();
        if (!name) return null;
        return { name, lat: null, lng: null };
      }
      if (s && typeof s === 'object') {
        const name = String(s.name ?? s.stop ?? '').trim();
        if (!name) return null;
        const lat = parseCoord(s.lat);
        const lng = parseCoord(s.lng);
        return {
          name,
          lat: isValidLat(lat) ? lat : null,
          lng: isValidLng(lng) ? lng : null,
        };
      }
      return null;
    })
    .filter(Boolean) as { name: string; lat: number | null; lng: number | null }[];
};

// ---------- POST ----------
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<RoutePayload>;
    console.log('🔵 POST /api/admin/routes:', body);

    const required: (keyof RoutePayload)[] = [
      'route_id',
      'route_name',
      'starting_point',
      'ending_point',
    ];

    const missing = required.filter(
      (key) =>
        body[key] === undefined ||
        body[key] === null ||
        (typeof body[key] === 'string' && (body[key] as string).trim() === '')
    );

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    const status = body.status ?? 'active';
    if (status !== 'active' && status !== 'inactive') {
      return NextResponse.json(
        { error: "Status must be either 'active' or 'inactive'." },
        { status: 400 }
      );
    }

    const startingLat = parseCoord(body.starting_latitude);
    const startingLng = parseCoord(body.starting_longitude);
    const endingLat = parseCoord(body.ending_latitude);
    const endingLng = parseCoord(body.ending_longitude);

    if (!isValidLat(startingLat)) {
      return NextResponse.json(
        { error: 'Starting latitude must be between -90 and 90.' },
        { status: 400 }
      );
    }
    if (!isValidLng(startingLng)) {
      return NextResponse.json(
        { error: 'Starting longitude must be between -180 and 180.' },
        { status: 400 }
      );
    }
    if (!isValidLat(endingLat)) {
      return NextResponse.json(
        { error: 'Ending latitude must be between -90 and 90.' },
        { status: 400 }
      );
    }
    if (!isValidLng(endingLng)) {
      return NextResponse.json(
        { error: 'Ending longitude must be between -180 and 180.' },
        { status: 400 }
      );
    }

    const allStops = normalizeStops(body.all_stops);

    // stop_timings aligned to allStops length
    const rawTimings = Array.isArray(body.stop_timings) ? body.stop_timings : [];
    const stopTimings = allStops.map((_, i) => {
      const t = rawTimings[i];
      return typeof t === 'string' ? t.trim() : '';
    });

    let vanId: string | null = null;
    if (body.assigned_van_id) {
      if (!UUID_RE.test(body.assigned_van_id)) {
        return NextResponse.json(
          { error: 'assigned_van_id must be a valid UUID.' },
          { status: 400 }
        );
      }
      const { data: van } = await supabase
        .from('vans')
        .select('id')
        .eq('id', body.assigned_van_id)
        .single();
      if (!van) {
        return NextResponse.json(
          { error: 'Assigned van not found.' },
          { status: 400 }
        );
      }
      vanId = body.assigned_van_id;
    }

    let driverId: string | null = null;
    if (body.assigned_driver_id) {
      if (!UUID_RE.test(body.assigned_driver_id)) {
        return NextResponse.json(
          { error: 'assigned_driver_id must be a valid UUID.' },
          { status: 400 }
        );
      }
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('id', body.assigned_driver_id)
        .single();
      if (!driver) {
        return NextResponse.json(
          { error: 'Assigned driver not found.' },
          { status: 400 }
        );
      }
      driverId = body.assigned_driver_id;
    }

    const { data, error } = await supabase
      .from('routes')
      .insert({
        route_id: body.route_id!.trim(),
        route_name: body.route_name!.trim(),
        starting_point: body.starting_point!.trim(),
        starting_latitude: startingLat,
        starting_longitude: startingLng,
        ending_point: body.ending_point!.trim(),
        ending_latitude: endingLat,
        ending_longitude: endingLng,
        all_stops: allStops,          // ✅ now objects with lat/lng
        stop_timings: stopTimings,    // ✅ parallel strings
        assigned_van_id: vanId,
        assigned_driver_id: driverId,
        status,
      })
      .select()
      .single();

    if (error) {
      console.error('🔴 Supabase insert error:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Route ID already exists.' },
          { status: 409 }
        );
      }
      if (error.code === '23514') {
        return NextResponse.json(
          { error: 'Invalid status value.' },
          { status: 400 }
        );
      }
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Referenced van or driver does not exist.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: error.message || 'Failed to create route.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Route created successfully.', route: data },
      { status: 201 }
    );
  } catch (err) {
    console.error('🔴 POST error:', err);
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}

// ---------- GET ----------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase
      .from('routes')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (search) {
      query = query.or(
        `route_id.ilike.%${search}%,route_name.ilike.%${search}%,starting_point.ilike.%${search}%,ending_point.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('🔴 Supabase fetch error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch routes.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ routes: data }, { status: 200 });
  } catch (err) {
    console.error('🔴 GET error:', err);
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}

// ---------- PATCH ----------
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    console.log('🔵 PATCH /api/admin/routes?id=' + id);

    if (!id || !UUID_RE.test(id)) {
      return NextResponse.json(
        { error: 'Valid route id is required in query string (?id=...).' },
        { status: 400 }
      );
    }

    const body = await req.json();
    console.log('🔵 PATCH body:', body);

    if (body.status !== undefined) {
      if (body.status !== 'active' && body.status !== 'inactive') {
        return NextResponse.json(
          { error: "Status must be either 'active' or 'inactive'." },
          { status: 400 }
        );
      }
    }

    if (body.all_stops !== undefined && !Array.isArray(body.all_stops)) {
      return NextResponse.json(
        { error: 'all_stops must be an array.' },
        { status: 400 }
      );
    }
    if (body.stop_timings !== undefined && !Array.isArray(body.stop_timings)) {
      return NextResponse.json(
        { error: 'stop_timings must be an array.' },
        { status: 400 }
      );
    }

    if (
      body.starting_latitude !== undefined &&
      !isValidLat(parseCoord(body.starting_latitude))
    ) {
      return NextResponse.json(
        { error: 'Starting latitude must be between -90 and 90.' },
        { status: 400 }
      );
    }
    if (
      body.starting_longitude !== undefined &&
      !isValidLng(parseCoord(body.starting_longitude))
    ) {
      return NextResponse.json(
        { error: 'Starting longitude must be between -180 and 180.' },
        { status: 400 }
      );
    }
    if (
      body.ending_latitude !== undefined &&
      !isValidLat(parseCoord(body.ending_latitude))
    ) {
      return NextResponse.json(
        { error: 'Ending latitude must be between -90 and 90.' },
        { status: 400 }
      );
    }
    if (
      body.ending_longitude !== undefined &&
      !isValidLng(parseCoord(body.ending_longitude))
    ) {
      return NextResponse.json(
        { error: 'Ending longitude must be between -180 and 180.' },
        { status: 400 }
      );
    }

    if (body.assigned_van_id) {
      if (!UUID_RE.test(body.assigned_van_id)) {
        return NextResponse.json(
          { error: 'assigned_van_id must be a valid UUID.' },
          { status: 400 }
        );
      }
      const { data: van } = await supabase
        .from('vans')
        .select('id')
        .eq('id', body.assigned_van_id)
        .single();
      if (!van) {
        return NextResponse.json(
          { error: 'Assigned van not found.' },
          { status: 400 }
        );
      }
    }

    if (body.assigned_driver_id) {
      if (!UUID_RE.test(body.assigned_driver_id)) {
        return NextResponse.json(
          { error: 'assigned_driver_id must be a valid UUID.' },
          { status: 400 }
        );
      }
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('id', body.assigned_driver_id)
        .single();
      if (!driver) {
        return NextResponse.json(
          { error: 'Assigned driver not found.' },
          { status: 400 }
        );
      }
    }

    if (body.starting_latitude !== undefined)
      body.starting_latitude = parseCoord(body.starting_latitude);
    if (body.starting_longitude !== undefined)
      body.starting_longitude = parseCoord(body.starting_longitude);
    if (body.ending_latitude !== undefined)
      body.ending_latitude = parseCoord(body.ending_latitude);
    if (body.ending_longitude !== undefined)
      body.ending_longitude = parseCoord(body.ending_longitude);

    // ✅ Normalize all_stops and align stop_timings
    if (body.all_stops !== undefined) {
      const norm = normalizeStops(body.all_stops);
      body.all_stops = norm;

      const rawTimings = Array.isArray(body.stop_timings)
        ? body.stop_timings
        : [];
      body.stop_timings = norm.map((_, i) => {
        const t = rawTimings[i];
        return typeof t === 'string' ? t.trim() : '';
      });
    }

    delete body.id;
    delete body.created_at;
    body.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('routes')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('🔴 Supabase update error:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Route not found.' }, { status: 404 });
      }
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Route ID already exists.' },
          { status: 409 }
        );
      }
      if (error.code === '23514') {
        return NextResponse.json(
          { error: 'Invalid status value.' },
          { status: 400 }
        );
      }
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Referenced van or driver does not exist.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: 'Route updated successfully.', route: data },
      { status: 200 }
    );
  } catch (err) {
    console.error('🔴 PATCH error:', err);
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}

// ---------- DELETE ----------
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    console.log('🔵 DELETE /api/admin/routes?id=' + id);

    if (!id || !UUID_RE.test(id)) {
      return NextResponse.json(
        { error: 'Valid route id is required in query string (?id=...).' },
        { status: 400 }
      );
    }

    const { error } = await supabase.from('routes').delete().eq('id', id);

    if (error) {
      console.error('🔴 Supabase delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: 'Route deleted successfully.' },
      { status: 200 }
    );
  } catch (err) {
    console.error('🔴 DELETE error:', err);
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}