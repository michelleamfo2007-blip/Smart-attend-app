import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inviteCode = searchParams.get('inviteCode');

    if (!inviteCode) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    const institution = await prisma.institutions.findUnique({
      where: { invite_code: inviteCode },
      select: {
        id: true,
        name: true,
      }
    });

    if (!institution) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    // Since programmes are nested inside departments -> colleges -> institution,
    // we fetch colleges for this institution and include departments and programmes
    const colleges = await prisma.colleges.findMany({
      where: { institution_id: institution.id },
      include: {
        departments: {
          include: {
            programmes: true
          }
        }
      }
    });

    // Flatten into a single list of programmes for the dropdown
    const programmes: any[] = [];
    colleges.forEach(college => {
      college.departments.forEach(dept => {
        dept.programmes.forEach(prog => {
          programmes.push({
            id: prog.id,
            name: prog.name,
            department: dept.name,
            college: college.name
          });
        });
      });
    });

    // Sort alphabetically
    programmes.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ 
      institution,
      programmes 
    });
  } catch (error) {
    console.error('Programmes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
