import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const payload = await verifyToken(token);
    if (!payload || payload.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rows } = await req.json();
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 });
    }

    const institutionId = payload.institutionId as string;

    let successCount = 0;
    let failedCount = 0;

    // Process rows sequentially to avoid race conditions with findOrCreate logic
    for (const row of rows) {
      try {
        const collegeName = row['College']?.trim();
        const deptName = row['Department']?.trim();
        const progName = row['Programme']?.trim();
        const courseCode = row['Course Code']?.trim();
        const courseName = row['Course Name']?.trim();
        const creditHours = parseInt(row['Credit Hours']) || 3;
        const level = String(row['Level'])?.trim();
        const semester = String(row['Semester'])?.trim();
        const isCompulsory = String(row['Is Compulsory'])?.trim().toLowerCase() !== 'false';

        if (!collegeName || !deptName || !progName || !courseCode || !courseName || !level || !semester) {
          failedCount++;
          continue;
        }

        // 1. Upsert College
        let college = await prisma.colleges.findFirst({
          where: { name: collegeName, institution_id: institutionId }
        });
        if (!college) {
          college = await prisma.colleges.create({
            data: { name: collegeName, institution_id: institutionId }
          });
        }

        // 2. Upsert Department
        let dept = await prisma.departments.findFirst({
          where: { name: deptName, college_id: college.id }
        });
        if (!dept) {
          dept = await prisma.departments.create({
            data: { name: deptName, college_id: college.id }
          });
        }

        // 3. Upsert Programme
        let prog = await prisma.programmes.findFirst({
          where: { name: progName, department_id: dept.id }
        });
        if (!prog) {
          prog = await prisma.programmes.create({
            data: { name: progName, department_id: dept.id }
          });
        }

        // 4. Upsert Course
        let course = await prisma.classes.findFirst({
          where: {
            course_code: courseCode,
            programme_id: prog.id,
            institution_id: institutionId
          }
        });

        if (!course) {
          await prisma.classes.create({
            data: {
              name: courseName,
              course_code: courseCode,
              credit_hours: creditHours,
              is_compulsory: isCompulsory,
              level: level,
              semester: semester,
              programme_id: prog.id,
              institution_id: institutionId
            }
          });
        } else {
          // Update if exists
          await prisma.classes.update({
            where: { id: course.id },
            data: {
              name: courseName,
              credit_hours: creditHours,
              is_compulsory: isCompulsory,
              level: level,
              semester: semester
            }
          });
        }

        successCount++;
      } catch (err) {
        console.error('Error importing row:', err);
        failedCount++;
      }
    }

    // Record the import in history
    await prisma.import_history.create({
      data: {
        institution_id: institutionId,
        uploaded_by: payload.userId,
        file_name: 'Catalogue_Bulk_Import.csv',
        import_type: 'CATALOGUE',
        success_count: successCount,
        failed_count: failedCount
      }
    });

    return NextResponse.json({ successCount, failedCount });

  } catch (error) {
    console.error('Catalogue Import API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
