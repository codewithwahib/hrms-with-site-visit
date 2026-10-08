// app/api/students/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ✅ Supabase client (use service role key for server-side writes)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---------- Types ----------
type StudentPayload = {
  student_id: string;
  full_name: string;
  father_name: string;
  department: string;
  semester: number;
  phone_number: string;
  emergency_contact: string;
  home_address: string;
  pickup_point: string;
  drop_point: string;
  cnic?: string | null;
  status?: 'active' | 'inactive';
  route_id?: string | null;
  van_id?: string | null;
};

// ---------- POST: Create Student ----------
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<StudentPayload>;

    // ✅ Required field validation
    const required: (keyof StudentPayload)[] = [
      'student_id',
      'full_name',
      'father_name',
      'department',
      'semester',
      'phone_number',
      'emergency_contact',
      'home_address',
      'pickup_point',
      'drop_point',
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

    // ✅ Semester check (must be > 0)
    const semesterNum = Number(body.semester);
    if (isNaN(semesterNum) || semesterNum <= 0) {
      return NextResponse.json(
        { error: 'Semester must be a number greater than 0.' },
        { status: 400 }
      );
    }

    // ✅ Status check (active | inactive)
    const status = body.status ?? 'active';
    if (status !== 'active' && status !== 'inactive') {
      return NextResponse.json(
        { error: "Status must be either 'active' or 'inactive'." },
        { status: 400 }
      );
    }

    // ✅ Insert into DB
    const { data, error } = await supabase
      .from('students')
      .insert({
        student_id: body.student_id!.trim(),
        full_name: body.full_name!.trim(),
        father_name: body.father_name!.trim(),
        department: body.department!.trim(),
        semester: semesterNum,
        phone_number: body.phone_number!.trim(),
        emergency_contact: body.emergency_contact!.trim(),
        home_address: body.home_address!.trim(),
        pickup_point: body.pickup_point!.trim(),
        drop_point: body.drop_point!.trim(),
        cnic: body.cnic?.trim() || null,
        status,
        route_id: body.route_id ?? null,
        van_id: body.van_id ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);

      // ✅ Handle unique constraint (student_id)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Student ID already exists. Please use a unique ID.' },
          { status: 409 }
        );
      }

      // ✅ Handle check constraint violations
      if (error.code === '23514') {
        return NextResponse.json(
          { error: 'Invalid value for semester or status.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: error.message || 'Failed to create student.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Student created successfully.',
        student: data,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/students error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

// ---------- GET: List All Students ----------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // optional filter
    const department = searchParams.get('department'); // optional filter
    const search = searchParams.get('search'); // optional search

    let query = supabase
      .from('students')
      .select(
        `
        id,
        student_id,
        full_name,
        father_name,
        department,
        semester,
        phone_number,
        emergency_contact,
        home_address,
        pickup_point,
        drop_point,
        cnic,
        status,
        route_id,
        van_id,
        created_at,
        updated_at
      `
      )
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (department) query = query.eq('department', department);
    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,student_id.ilike.%${search}%,father_name.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch students.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ students: data }, { status: 200 });
  } catch (err) {
    console.error('GET /api/students error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}