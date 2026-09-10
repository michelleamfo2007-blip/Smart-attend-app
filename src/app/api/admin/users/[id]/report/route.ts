import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth, isCrossTenant } from '@/lib/session';
import {
  buildStudentAttendanceReport,
  studentReportToCsv,
  studentReportToPrintHtml,
} from '@/lib/studentReport';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }

    const target = await prisma.users.findUnique({
      where: { id },
      select: { id: true, role: true, institution_id: true, name: true, student_id: true },
    });

    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (isCrossTenant(auth, target.institution_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (target.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Reports are only available for students.' }, { status: 400 });
    }

    const report = await buildStudentAttendanceReport(id);
    if (!report) return NextResponse.json({ error: 'Unable to build report' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const format = (searchParams.get('format') || 'json').toLowerCase();
    const safeName = (target.student_id || target.name || 'student')
      .replace(/[^a-zA-Z0-9-_]+/g, '_')
      .slice(0, 40);

    if (format === 'csv') {
      const csv = studentReportToCsv(report);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="attendance-report-${safeName}.csv"`,
        },
      });
    }

    if (format === 'html' || format === 'pdf') {
      const html = studentReportToPrintHtml(report);
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    return NextResponse.json({ report });
  } catch (error: any) {
    console.error('Student report error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
