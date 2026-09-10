import prisma from '@/lib/prisma';

/** Classes the student has explicitly joined (enrollments only). */
export async function getStudentClasses(userId: string) {
  const enrollments = await prisma.enrollments.findMany({
    where: { student_id: userId },
    include: {
      class: {
        include: {
          lecturer: { select: { id: true, name: true } },
          classroom: { select: { id: true, name: true } },
        },
      },
    },
  });

  return enrollments.map((enrollment) => enrollment.class).filter(Boolean);
}
