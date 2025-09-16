
import { RawLead, ProcessedLead } from '../types';

export const parseCSV = (csvText: string): RawLead[] => {
    const lines = [];
    let currentLine: string[] = [];
    let field = '';
    let inQuotes = false;

    const text = csvText.trim();

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (inQuotes) {
            if (char === '"' && nextChar === '"') {
                // Escaped double quote
                field += '"';
                i++; // Skip the next quote
            } else if (char === '"') {
                // End of quoted field
                inQuotes = false;
            } else {
                field += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentLine.push(field);
                field = '';
            } else if (char === '\r' || char === '\n') {
                // End of line
                currentLine.push(field);
                lines.push(currentLine);
                currentLine = [];
                field = '';
                // Handle CRLF by skipping the next character if it's \n
                if (char === '\r' && nextChar === '\n') {
                    i++;
                }
            } else {
                field += char;
            }
        }
    }

    // Add the last field and line if the file doesn't end with a newline
    if (field || currentLine.length > 0) {
        currentLine.push(field);
        lines.push(currentLine);
    }
    
    const nonEmptyLines = lines.filter(line => line.length > 1 || (line.length === 1 && line[0].trim() !== ''));

    if (nonEmptyLines.length < 2) {
        return [];
    }

    const headers = nonEmptyLines[0].map(h => h.trim().replace(/^"|"$/g, ''));
    const dataRows = nonEmptyLines.slice(1);
    
    const records: RawLead[] = [];
    for (const row of dataRows) {
        // Skip empty rows that might have been parsed
        if (row.every(cell => cell.trim() === '')) continue;
        
        const record: RawLead = {};
        headers.forEach((header, index) => {
            record[header] = row[index] || '';
        });
        records.push(record);
    }
    
    return records;
};

export const normalizeHeaders = (lead: RawLead): RawLead => {
    const normalized: RawLead = {};
    for (const key in lead) {
        const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
        normalized[normalizedKey] = lead[key];
    }
    return normalized;
};

const escapeCsvField = (field: any): string => {
    if (field === null || field === undefined) {
        return '';
    }
    const str = String(field);
    // If the string contains a comma, double quote, or newline, wrap it in double quotes.
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        // Escape existing double quotes by doubling them up
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};


export const convertToCSV = (data: (Partial<ProcessedLead>|ProcessedLead)[]): string => {
    if (data.length === 0) return '';
    
    // Define display headers and their corresponding data keys
    const headers = [
        'Name & Suburb', 'company', 'first_name', 'phone', 'mobile_phone', 'description', 
        'category', 'SFDC Category', 'city', 'state', 'suburb', 'first_referrer_url', 'website', 
        'abn', 'scrape_date', 'aiReason'
    ];
    
    const keys: (keyof ProcessedLead | 'aiReason')[] = [
        'name_and_suburb', 'company', 'first_name', 'phone', 'mobile_phone', 'description', 
        'category', 'sfdc_category', 'city', 'state', 'suburb', 'first_referrer_url', 'website', 
        'abn', 'scrape_date', 'aiReason'
    ];
    
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
        const values = keys.map(key => {
            return escapeCsvField(row[key as keyof typeof row]);
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
};

export const convertSetToCsv = (data: Set<string>, header: string): string => {
    const rows = [header];
    data.forEach(value => {
        rows.push(escapeCsvField(value));
    });
    return rows.join('\n');
};

export const downloadCSV = (csvString: string, fileName: string) => {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};