import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export const exportAttendanceToPDF = async (groupedRecords: any[], title: string = "Attendance Report") => {
  try {
    let htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; }
            h2 { background-color: #f3f4f6; padding: 10px; margin-top: 20px; border-radius: 4px; color: #374151; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
            th { background-color: #f9fafb; font-weight: bold; color: #111827; }
            td { color: #4b5563; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
    `;

    groupedRecords.forEach(section => {
      htmlContent += `<h2>${section.title}</h2>`;
      htmlContent += `
        <table>
          <tr>
            <th>Student Name</th>
            <th>Time</th>
            <th>Status</th>
          </tr>
      `;
      section.data.forEach((record: any) => {
        const studentName = record.users?.name || record.student_name || 'Unknown Student';
        const time = new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        htmlContent += `
          <tr>
            <td>${studentName}</td>
            <td>${time}</td>
            <td style="color: #166534; font-weight: bold;">Present</td>
          </tr>
        `;
      });
      htmlContent += `</table>`;
    });

    htmlContent += `</body></html>`;

    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    }
  } catch (error) {
    console.error("Error exporting PDF:", error);
    throw error;
  }
};
