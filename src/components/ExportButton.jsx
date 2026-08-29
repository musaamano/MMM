import { useState, useEffect } from 'react';
import { FileDown, Send } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { sendReport, getCurrentUser } from '../api/api';
import './ExportButton.css';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ExportButton = ({ data, filename, reportTitle }) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [exportedFile, setExportedFile] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareError, setShareError] = useState('');
  const currentUser = getCurrentUser();

  const handleExportPDF = async () => {
    setExporting(true);
    setShowExportMenu(false);

    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.setTextColor(50, 205, 50);
      doc.text(reportTitle || 'Report', 14, 20);
      
      // Add date
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
      
      // Prepare table data
      if (data && data.length > 0) {
        const columns = Object.keys(data[0]).map(key => ({
          header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
          dataKey: key
        }));
        
        const rows = data.map(item => {
          const row = {};
          Object.keys(item).forEach(key => {
            row[key] = item[key];
          });
          return row;
        });
        
        // Add table
        doc.autoTable({
          columns: columns,
          body: rows,
          startY: 35,
          theme: 'grid',
          headStyles: {
            fillColor: [50, 205, 50],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          styles: {
            fontSize: 9,
            cellPadding: 3
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          }
        });
      }
      
      // Save PDF
      doc.save(`${filename}.pdf`);
      
      setExportedFile({ type: 'PDF', filename: `${filename}.pdf` });
      setShowShareModal(true);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    setShowExportMenu(false);

    try {
      // Prepare data for Excel
      const worksheetData = data.map(item => {
        const row = {};
        Object.keys(item).forEach(key => {
          const header = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
          row[header] = item[key];
        });
        return row;
      });
      
      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, reportTitle || 'Report');
      
      // Style the header row
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + "1";
        if (!worksheet[address]) continue;
        worksheet[address].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "32CD32" } }
        };
      }
      
      // Save Excel file
      XLSX.writeFile(workbook, `${filename}.xlsx`);
      
      setExportedFile({ type: 'Excel', filename: `${filename}.xlsx` });
      setShowShareModal(true);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export Excel');
    } finally {
      setExporting(false);
    }
  };

  const handleShareWithOfficer = async () => {
    setSharing(true);
    setShareError('');
    try {
      // Fetch transport officers from backend
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const users = await res.json();
      const officers = users.filter(u => u.role === 'TRANSPORT' && u.isActive);

      if (officers.length === 0) {
        setShareError('No active Transport Officers found.');
        setSharing(false);
        return;
      }

      // Send report to each transport officer
      const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
      await Promise.all(officers.map(officer =>
        sendReport({
          reportType: filename,
          reportName: reportTitle || filename,
          sentTo: officer.username,
          data,
          columns,
        })
      ));

      setShareSuccess(true);
    } catch (err) {
      setShareError(err.message || 'Failed to share report.');
    } finally {
      setSharing(false);
    }
  };

  const handleCloseModal = () => {
    setShowShareModal(false);
    setExportedFile(null);
    setShareSuccess(false);
    setShareError('');
  };

  return (
    <>
      <div className="export-button-container">
        <button
          className="export-button"
          onClick={() => setShowExportMenu(!showExportMenu)}
          disabled={exporting}
        >
          <FileDown size={18} />
          <span>{exporting ? 'Exporting...' : 'Export Report'}</span>
        </button>

        {showExportMenu && (
          <div className="export-menu">
            <div className="export-menu-header">Export Format</div>
            <button className="export-option pdf" onClick={handleExportPDF}>
              <span className="option-icon">📄</span>
              <span>Export as PDF</span>
            </button>
            <button className="export-option excel" onClick={handleExportExcel}>
              <span className="option-icon">📊</span>
              <span>Export as Excel</span>
            </button>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="share-modal-overlay" onClick={handleCloseModal}>
          <div className="share-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="share-modal-header">
              <h3>{shareSuccess ? 'Report Shared!' : 'Export Successful!'}</h3>
              <button className="modal-close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <div className="share-modal-body">
              {shareSuccess ? (
                <>
                  <div className="success-icon">✅</div>
                  <p className="success-message">
                    Report successfully shared with all active Transport Officers.
                  </p>
                  <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center' }}>
                    They can view it in their Reports section.
                  </p>
                </>
              ) : (
                <>
                  <div className="success-icon">✅</div>
                  <p className="success-message">
                    Your report has been exported as <strong>{exportedFile?.type}</strong>
                  </p>
                  <p className="share-question">
                    Would you like to share this report with the Transport Officer?
                  </p>
                  <div className="officer-preview">
                    <div className="officer-preview-icon">🚗</div>
                    <div className="officer-preview-info">
                      <div className="officer-preview-name">Transport Officer(s)</div>
                      <div className="officer-preview-email">All active transport officers will receive this report</div>
                    </div>
                  </div>
                  {shareError && (
                    <p style={{ color: '#dc2626', fontSize: 13, textAlign: 'center', marginTop: 8 }}>
                      {shareError}
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="share-modal-footer">
              {shareSuccess ? (
                <button className="btn-share-officer" onClick={handleCloseModal}>
                  Done
                </button>
              ) : (
                <>
                  <button className="btn-skip" onClick={handleCloseModal} disabled={sharing}>
                    No, Thanks
                  </button>
                  <button className="btn-share-officer" onClick={handleShareWithOfficer} disabled={sharing}>
                    <Send size={16} style={{ marginRight: 6 }} />
                    {sharing ? 'Sharing...' : 'Yes, Share Report'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExportButton;
