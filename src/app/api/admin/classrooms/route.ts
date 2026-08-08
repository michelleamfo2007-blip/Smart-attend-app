import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    const institutionId = payload?.institutionId as string;
    if (!institutionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const classrooms = await prisma.classrooms.findMany({
      where: { institution_id: institutionId },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json(classrooms);
  } catch (error) {
    console.error('Fetch classrooms error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    const institutionId = payload?.institutionId as string;
    if (!institutionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, latitude, longitude, radius_meters } = body;

    if (!name) {
      return NextResponse.json({ error: 'Classroom name is required' }, { status: 400 });
    }

    const classroom = await prisma.classrooms.create({
      data: {
        name,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        radius_meters: radius_meters ? parseInt(radius_meters) : 50,
        institution_id: institutionId,
      }
    });

    return NextResponse.json({ success: true, classroom }, { status: 201 });
  } catch (error) {
    console.error('Create classroom error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
