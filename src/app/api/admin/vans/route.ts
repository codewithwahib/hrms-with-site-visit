// app/api/admin/vans/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type VanPayload = {
  van_id: string;
  vehicle_number: string;
  van_model: string;
  capacity: number;
  current_passengers?: number;
  driver_id?: string | null;
  driver_assigned?: string | null;
  route_assigned?: string | null;
  status?: 'active' | 'maintenance' | 'out_of_service';
};

// ---------- POST: Create Van ----------
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<VanPayload>;

    // ✅ Required fields
    const required: (keyof VanPayload)[] = [
      'van_id',
      'vehicle_number',
      'van_model',
      'capacity',
    ];

    const missing = required.filter(
      (key) => body[key] === undefined || body[key] === null || body[key] === ''
    );

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // ✅ Capacity > 0
    const capacity = Number(body.capacity);
    if (isNaN(capacity) || capacity <= 0) {
      return NextResponse.json(
        { error: 'Capacity must be a number greater than 0.' },
        { status: 400 }
      );
    }

    // ✅ current_passengers >= 0
    const currentPassengers = Number(body.current_passengers ?? 0);
    if (isNaN(currentPassengers) || currentPassengers < 0) {
      return NextResponse.json(
        { error: 'Current passengers cannot be negative.' },
        { status: 400 }
      );
    }

    // ✅ current_passengers <= capacity
    if (currentPassengers > capacity) {
      return NextResponse.json(
        { error: 'Current passengers cannot exceed capacity.' },
        { status: 400 }
      );
    }

    // ✅ Status check
    const status = body.status ?? 'active';
    const allowedStatuses = ['active', 'maintenance', 'out_of_service'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        {
          error:
            "Status must be one of: 'active', 'maintenance', or 'out_of_service'.",
        },
        { status: 400 }
      );
    }

    // ✅ Insert
    const { data, error } = await supabase
      .from('vans')
      .insert({
        van_id: body.van_id!.trim(),
        vehicle_number: body.vehicle_number!.trim().toUpperCase(),
        van_model: body.van_model!.trim(),
        capacity,
        current_passengers: currentPassengers,
        driver_id: body.driver_id ?? null,
        driver_assigned: body.driver_assigned?.trim() || null,
        route_assigned: body.route_assigned?.trim() || null,
        status,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);

      // ✅ Unique constraint handling
      if (error.code === '23505') {
        if (error.message.includes('vans_van_id_key')) {
          return NextResponse.json(
            { error: 'Van ID already exists. Please use a unique ID.' },
            { status: 409 }
          );
        }
        if (error.message.includes('vans_vehicle_number_key')) {
          return NextResponse.json(
            { error: 'Vehicle number already exists.' },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: 'Duplicate entry. Please check your values.' },
          { status: 409 }
        );
      }

      // ✅ Check constraint handling
      if (error.code === '23514') {
        return NextResponse.json(
          {
            error:
              'Invalid value: check capacity, current passengers, or status.',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: error.message || 'Failed to create van.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Van created successfully.', van: data },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/admin/vans error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

// ---------- GET: List All Vans ----------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase
      .from('vans')
      .select(
        `
        id,
        van_id,
        vehicle_number,
        van_model,
        capacity,
        current_passengers,
        driver_id,
        driver_assigned,
        route_assigned,
        status,
        created_at,
        updated_at
      `
      )
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (search) {
      query = query.or(
        `van_id.ilike.%${search}%,vehicle_number.ilike.%${search}%,van_model.ilike.%${search}%,driver_assigned.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch vans.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ vans: data }, { status: 200 });
  } catch (err) {
    console.error('GET /api/admin/vans error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}