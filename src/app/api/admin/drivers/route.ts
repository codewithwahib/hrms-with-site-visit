// app/api/admin/drivers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type DriverPayload = {
  driver_id: string;
  full_name: string;
  profile_image?: string | null;
  cnic: string;
  phone_number: string;
  emergency_contact: string;
  driving_license: string;
  license_expiry_date: string; // ISO date string YYYY-MM-DD
  assigned_van_id?: string | null;
  assigned_route_id?: string | null;
  status?: 'active' | 'inactive' | 'on_leave';
};

// ---------- POST: Create Driver ----------
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<DriverPayload>;

    // ✅ Required fields
    const required: (keyof DriverPayload)[] = [
      'driver_id',
      'full_name',
      'cnic',
      'phone_number',
      'emergency_contact',
      'driving_license',
      'license_expiry_date',
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

    // ✅ Validate date format
    const expiryDate = new Date(body.license_expiry_date!);
    if (isNaN(expiryDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid license expiry date.' },
        { status: 400 }
      );
    }

    // ✅ Status check
    const status = body.status ?? 'active';
    const allowedStatuses = ['active', 'inactive', 'on_leave'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        {
          error:
            "Status must be one of: 'active', 'inactive', or 'on_leave'.",
        },
        { status: 400 }
      );
    }

    // ✅ Insert
    const { data, error } = await supabase
      .from('drivers')
      .insert({
        driver_id: body.driver_id!.trim(),
        full_name: body.full_name!.trim(),
        profile_image: body.profile_image?.trim() || null,
        cnic: body.cnic!.trim(),
        phone_number: body.phone_number!.trim(),
        emergency_contact: body.emergency_contact!.trim(),
        driving_license: body.driving_license!.trim(),
        license_expiry_date: body.license_expiry_date,
        assigned_van_id: body.assigned_van_id ?? null,
        assigned_route_id: body.assigned_route_id ?? null,
        status,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);

      // ✅ Unique constraint handling
      if (error.code === '23505') {
        if (error.message.includes('drivers_driver_id_key')) {
          return NextResponse.json(
            { error: 'Driver ID already exists. Please use a unique ID.' },
            { status: 409 }
          );
        }
        if (error.message.includes('drivers_cnic_key')) {
          return NextResponse.json(
            { error: 'CNIC already registered.' },
            { status: 409 }
          );
        }
        if (error.message.includes('drivers_driving_license_key')) {
          return NextResponse.json(
            { error: 'Driving license already registered.' },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: 'Duplicate entry. Please check your values.' },
          { status: 409 }
        );
      }

      // ✅ Check constraint violation
      if (error.code === '23514') {
        return NextResponse.json(
          { error: 'Invalid value for status.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: error.message || 'Failed to create driver.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Driver created successfully.', driver: data },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/admin/drivers error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

// ---------- GET: List All Drivers ----------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase
      .from('drivers')
      .select(
        `
        id,
        driver_id,
        full_name,
        profile_image,
        cnic,
        phone_number,
        emergency_contact,
        driving_license,
        license_expiry_date,
        assigned_van_id,
        assigned_route_id,
        status,
        created_at,
        updated_at
      `
      )
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (search) {
      query = query.or(
        `driver_id.ilike.%${search}%,full_name.ilike.%${search}%,cnic.ilike.%${search}%,phone_number.ilike.%${search}%,driving_license.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch drivers.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ drivers: data }, { status: 200 });
  } catch (err) {
    console.error('GET /api/admin/drivers error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}