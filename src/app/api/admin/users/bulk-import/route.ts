import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('cookie') || req.headers.get('authorization');
    // Basic auth check placeholder - adapt to your actual auth check
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { users, institutionId } = await req.json();

    if (!users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty user data' }, { status: 400 });
    }

    if (!institutionId) {
      return NextResponse.json({ error: 'Institution ID is required' }, { status: 400 });
    }

    // Process in a transaction or individual creates
    // For large imports, createMany is better but we might want to hash passwords
    // Let's create users individually to handle password hashing
    
    let successCount = 0;
    const defaultPassword = await bcrypt.hash('Welcome123!', 10);

    for (const userData of users) {
      // Check if user exists
      const existing = await prisma.users.findUnique({
        where: { email: userData.email }
      });

      if (!existing) {
        await prisma.users.create({
          data: {
            name: userData.name,
            email: userData.email,
            role: userData.role,
            institution_id: institutionId,
            level: userData.level || null,
            semester: userData.semester || null,
            password: defaultPassword, // Users should change this on first login
          }
        });
        successCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: successCount,
      message: `Successfully imported ${successCount} users. Existing emails were skipped.`
    });

  } catch (error: any) {
    console.error('Bulk import error:', error);
    return NextResponse.json({ error: 'Failed to process bulk import' }, { status: 500 });
  }
}
