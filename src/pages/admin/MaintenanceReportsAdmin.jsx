import { useState, useEffect } from 'react';
import { FileText, Download, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './adminTheme.css';

const BASE = `http://${window.location.hostname}:5000/api`;
const token = () => localStorage.getItem('token');

export default function MaintenanceReportsAdmin() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/reports/received`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setReports(data.filter(r => r.reportType === 'maintenance'));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const downloadPDF = (report) => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.setTextColor(22, 163, 74);
    doc.text(report.reportName, 14, 20);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Sent by: ${report.sentBy}  |  Date: ${new Date(report.createdAt).toLocaleString()}`, 14, 28);

    if (report.columns?.length && report.data?.length) {
      doc.autoTable({
        head: [report.columns],
        body: report.data.map(row =>
          Array.isArray(row) ? row : report.columns.map(c => row[c] ?? '')
        ),
        startY: 36,
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 253, 244] },
        styles: { fontSize: 9, cellPadding: 3 },
      });
    }
    doc.save(`${report.reportName.replace(/\s+/g, '_')}.pdf`);
  };

  const downloadExcel = (report) => {
    if (!report.data?.length || !report.columns?.length) { alert('No data'); return; }
    const rows = report.data.map(row =>
      Array.isArray(row)
        ? Object.fromEntries(report.columns.map((c, i) => [c, row[i] ?? '']))
        : row
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, report.reportName.slice(0, 31));
    XLSX.writeFile(wb, `${report.reportName.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Maintenance Reports</h2>
        <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Reports sent by the Maintenance Officer</p>
      </div>

      {loading ? (
        <p style={{ color: '#9ca3af', textAlign: 'center', padding: 40 }}>Loading...</p>
      ) : reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <FileText size={48} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p>No maintenance reports received yet.</p>
          <p style={{ fontSize: 13, opacity: 0.7 }}>Reports sent by the Maintenance Officer will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {reports.map(report => (
            <div key={report._id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, background: '#dcfce7', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={22} color="#16a34a" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{report.reportName}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    Sent by <strong>{report.sentBy}</strong>
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                    {new Date(report.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ background: '#dcfce7', color: '#16a34a', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  Maintenance
                </span>
                <span style={{ fontSize: 12, color: '#6b7280' }}>{report.data?.length || 0} rows</span>
              </div>

              {/* Preview table */}
              {report.data?.length > 0 && report.columns?.length > 0 && (
                <div style={{ overflowX: 'auto', marginBottom: 14, maxHeight: 160, overflowY: 'auto', border: '1px solid #f3f4f6', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        {report.columns.map(c => (
                          <th key={c} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.data.slice(0, 5).map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                          {report.columns.map(c => (
                            <td key={c} style={{ padding: '6px 10px', color: '#374151' }}>
                              {Array.isArray(row) ? row[report.columns.indexOf(c)] : row[c]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => downloadPDF(report)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <FileText size={14} /> PDF
                </button>
                <button onClick={() => downloadExcel(report)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <FileSpreadsheet size={14} /> Excel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
