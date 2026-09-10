import prisma from '@/lib/prisma';

export type StudentReportClass = {
  classId: string;
  className: string;
  courseCode: string | null;
  level: string | null;
  semester: string | null;
  totalSessions: number;
  attendedSessions: number;
  missedSessions: number;
  percentage: number;
};

export type StudentReportEvent = {
  sessionId: string;
  className: string;
  courseCode: string | null;
  date: string;
  status: 'Present' | 'Absent';
  method: string | null;
  markedBy: string | null;
};

export type StudentReport = {
  generatedAt: string;
  institution: { id: string; name: string } | null;
  student: {
    id: string;
    name: string | null;
    email: string | null;
    studentId: string | null;
    level: string | null;
    semester: string | null;
    program: string | null;
  };
  overall: {
    totalSessions: number;
    attendedSessions: number;
    missedSessions: number;
    percentage: number;
    status: 'Excellent' | 'Warning' | 'At Risk';
  };
  classes: StudentReportClass[];
  timeline: StudentReportEvent[];
};

function statusLabel(percentage: number): StudentReport['overall']['status'] {
  if (percentage >= 75) return 'Excellent';
  if (percentage >= 50) return 'Warning';
  return 'At Risk';
}

export async function buildStudentAttendanceReport(studentId: string): Promise<StudentReport | null> {
  const user = await prisma.users.findUnique({
    where: { id: studentId },
    include: {
      institution: { select: { id: true, name: true } },
      enrollments: {
        include: {
          class: {
            include: {
              sessions: {
                select: { id: true, created_at: true, status: true },
                orderBy: { created_at: 'asc' },
              },
            },
          },
        },
      },
      records: {
        select: {
          session_id: true,
          timestamp: true,
          method: true,
          marked_by: { select: { name: true } },
        },
      },
    },
  });

  if (!user || user.role !== 'STUDENT') return null;

  const attendedSessionIds = new Set((user.records || []).map((r) => r.session_id));
  const recordBySession = new Map((user.records || []).map((r) => [r.session_id, r]));
  const timeline: StudentReportEvent[] = [];

  const classes: StudentReportClass[] = (user.enrollments || []).map((enr) => {
    const classData = enr.class;
    const sessions = classData?.sessions || [];
    const totalSessions = sessions.length;
    let attendedSessions = 0;

    sessions.forEach((s) => {
      const attended = attendedSessionIds.has(s.id);
      if (attended) attendedSessions += 1;

      const record = recordBySession.get(s.id);
      timeline.push({
        sessionId: s.id,
        className: classData?.name || 'Unknown Class',
        courseCode: classData?.course_code || null,
        date: s.created_at.toISOString(),
        status: attended ? 'Present' : 'Absent',
        method: attended ? record?.method || 'dynamic_qr' : null,
        markedBy: attended ? record?.marked_by?.name || null : null,
      });
    });

    return {
      classId: classData?.id || 'unknown',
      className: classData?.name || 'Unknown Class',
      courseCode: classData?.course_code || null,
      level: classData?.level || null,
      semester: classData?.semester || null,
      totalSessions,
      attendedSessions,
      missedSessions: totalSessions - attendedSessions,
      percentage: totalSessions === 0 ? 100 : Math.round((attendedSessions / totalSessions) * 100),
    };
  });

  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let totalSessions = 0;
  let attendedSessions = 0;
  classes.forEach((c) => {
    totalSessions += c.totalSessions;
    attendedSessions += c.attendedSessions;
  });

  const percentage = totalSessions === 0 ? 100 : Math.round((attendedSessions / totalSessions) * 100);

  return {
    generatedAt: new Date().toISOString(),
    institution: user.institution,
    student: {
      id: user.id,
      name: user.name,
      email: user.email,
      studentId: user.student_id,
      level: user.level,
      semester: user.semester,
      program: user.program,
    },
    overall: {
      totalSessions,
      attendedSessions,
      missedSessions: totalSessions - attendedSessions,
      percentage,
      status: statusLabel(percentage),
    },
    classes,
    timeline,
  };
}

function csvEscape(value: unknown) {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function studentReportToCsv(report: StudentReport) {
  const lines: string[] = [];
  lines.push('SmartAttend Student Attendance Report');
  lines.push(`Generated,${csvEscape(report.generatedAt)}`);
  lines.push(`Institution,${csvEscape(report.institution?.name || '')}`);
  lines.push(`Student Name,${csvEscape(report.student.name || '')}`);
  lines.push(`Index Number,${csvEscape(report.student.studentId || '')}`);
  lines.push(`Level,${csvEscape(report.student.level || '')}`);
  lines.push(`Semester,${csvEscape(report.student.semester || '')}`);
  lines.push(`Program,${csvEscape(report.student.program || '')}`);
  lines.push(
    `Overall Attendance,${report.overall.percentage}%,${report.overall.attendedSessions}/${report.overall.totalSessions},${csvEscape(report.overall.status)}`
  );
  lines.push('');
  lines.push('Class Breakdown');
  lines.push('Course Code,Class Name,Level,Semester,Attended,Total,Missed,Percentage');
  report.classes.forEach((cls) => {
    lines.push(
      [
        cls.courseCode,
        cls.className,
        cls.level,
        cls.semester,
        cls.attendedSessions,
        cls.totalSessions,
        cls.missedSessions,
        `${cls.percentage}%`,
      ]
        .map(csvEscape)
        .join(',')
    );
  });
  lines.push('');
  lines.push('Attendance History');
  lines.push('Date,Course Code,Class Name,Status,Method,Marked By');
  report.timeline.forEach((event) => {
    lines.push(
      [
        new Date(event.date).toISOString(),
        event.courseCode,
        event.className,
        event.status,
        event.method,
        event.markedBy,
      ]
        .map(csvEscape)
        .join(',')
    );
  });

  return lines.join('\n');
}

export function studentReportToPrintHtml(report: StudentReport) {
  const generated = new Date(report.generatedAt).toLocaleString();
  const classRows = report.classes
    .map(
      (cls) => `<tr>
      <td>${escapeHtml(cls.courseCode || '—')}</td>
      <td>${escapeHtml(cls.className)}</td>
      <td>${cls.attendedSessions}/${cls.totalSessions}</td>
      <td>${cls.missedSessions}</td>
      <td><strong>${cls.percentage}%</strong></td>
    </tr>`
    )
    .join('');

  const historyRows = report.timeline
    .map(
      (event) => `<tr>
      <td>${escapeHtml(new Date(event.date).toLocaleString())}</td>
      <td>${escapeHtml(event.courseCode || '—')}</td>
      <td>${escapeHtml(event.className)}</td>
      <td style="color:${event.status === 'Present' ? '#15803d' : '#b91c1c'};font-weight:700">${event.status}</td>
      <td>${escapeHtml(event.method ? event.method.replace(/_/g, ' ') : '—')}</td>
      <td>${escapeHtml(event.markedBy || '—')}</td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Attendance Report — ${escapeHtml(report.student.name || 'Student')}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
    h1 { margin: 0 0 4px; font-size: 22px; }
    h2 { margin: 28px 0 10px; font-size: 16px; }
    .muted { color: #64748b; font-size: 13px; }
    .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-top: 16px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 14px; }
    .stat { font-size: 28px; font-weight: 800; color: #e01e37; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border-bottom: 1px solid #e2e8f0; padding: 8px 6px; text-align: left; }
    th { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
    @media print { body { margin: 12mm; } .no-print { display: none; } }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()" style="padding:10px 14px;border:none;background:#e01e37;color:white;border-radius:8px;font-weight:700;cursor:pointer;margin-bottom:16px;">Print / Save as PDF</button>
  <h1>Student Attendance Report</h1>
  <p class="muted">${escapeHtml(report.institution?.name || 'SmartAttend')} · Generated ${escapeHtml(generated)}</p>

  <div class="card">
    <div class="grid">
      <div><strong>Name</strong><br/>${escapeHtml(report.student.name || '—')}</div>
      <div><strong>Index Number</strong><br/>${escapeHtml(report.student.studentId || '—')}</div>
      <div><strong>Level / Semester</strong><br/>${escapeHtml(report.student.level || '—')} / ${escapeHtml(report.student.semester || '—')}</div>
      <div><strong>Program</strong><br/>${escapeHtml(report.student.program || '—')}</div>
      <div><strong>Overall Status</strong><br/>${escapeHtml(report.overall.status)}</div>
    </div>
    <p style="margin:16px 0 0"><span class="stat">${report.overall.percentage}%</span>
      <span class="muted"> · ${report.overall.attendedSessions} of ${report.overall.totalSessions} sessions attended (${report.overall.missedSessions} missed)</span>
    </p>
  </div>

  <h2>Class Breakdown</h2>
  <table>
    <thead><tr><th>Code</th><th>Class</th><th>Attended</th><th>Missed</th><th>%</th></tr></thead>
    <tbody>${classRows || '<tr><td colspan="5">No enrolled classes.</td></tr>'}</tbody>
  </table>

  <h2>Attendance History</h2>
  <table>
    <thead><tr><th>Date</th><th>Code</th><th>Class</th><th>Status</th><th>Method</th><th>Marked By</th></tr></thead>
    <tbody>${historyRows || '<tr><td colspan="6">No session history.</td></tr>'}</tbody>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
