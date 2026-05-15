export interface CSVRow {
  qr_code: string;
  label: string;
  description: string;
}

export function parseCSV(csvContent: string): CSVRow[] {
  const lines = csvContent.split('\n').filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV must contain header and at least one data row');
  }

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const requiredColumns = ['qr_code', 'label', 'description'];
  const missingColumns = requiredColumns.filter((col) => !header.includes(col));

  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    const qrCodeIdx = header.indexOf('qr_code');
    const labelIdx = header.indexOf('label');
    const descIdx = header.indexOf('description');

    rows.push({
      qr_code: values[qrCodeIdx] || '',
      label: values[labelIdx] || '',
      description: values[descIdx] || '',
    });
  }

  return rows;
}

export function validateCSVRows(
  rows: CSVRow[],
  existingQRCodes: Set<string>
): string[] {
  const errors: string[] = [];
  const seenQRCodes = new Set<string>();

  rows.forEach((row, idx) => {
    const lineNum = idx + 2;

    if (!row.qr_code) {
      errors.push(`Row ${lineNum}: QR code is required`);
    }
    if (!row.label) {
      errors.push(`Row ${lineNum}: Label is required`);
    }
    if (existingQRCodes.has(row.qr_code)) {
      errors.push(`Row ${lineNum}: QR code already exists in project`);
    }
    if (seenQRCodes.has(row.qr_code)) {
      errors.push(`Row ${lineNum}: Duplicate QR code in CSV`);
    }
    seenQRCodes.add(row.qr_code);
  });

  return errors;
}
