// apps/tool-file-converter/src/services/adapters/contact-conversion.adapter.ts
import { Injectable } from '@angular/core';
import { IConversionAdapter } from '../adapter.interface';
import { ConversionOptions, ConversionResult, ExecutionMode, FileCategory, FormatDescriptor } from '../../models/converter.models';

const SUPPORTED_OUTPUTS_MAP: Record<string, FormatDescriptor[]> = {
  vcf: [
    { format: 'csv', label: 'CSV Spreadsheet', extension: 'csv', mimeType: 'text/csv', category: 'contact', executionMode: 'browser', description: 'Universal tabular format compatible with Excel and Google Sheets', lossless: true }
  ],
  csv: [
    { format: 'vcf', label: 'vCard (.vcf)', extension: 'vcf', mimeType: 'text/vcard', category: 'contact', executionMode: 'browser', description: 'Universal contact card format for Apple Contacts, Android, and Outlook', lossless: true }
  ]
};

interface ParsedContact {
  fullName: string;
  firstName: string;
  lastName: string;
  organization: string;
  jobTitle: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  notes: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContactConversionAdapter implements IConversionAdapter {
  readonly id = 'contact-adapter';
  readonly name = 'Contact Conversion Adapter';
  readonly category: FileCategory = 'contact';
  readonly executionMode: ExecutionMode = 'browser';

  canConvert(sourceFormat: string, targetFormat: string): boolean {
    const src = sourceFormat.toLowerCase();
    const tgt = targetFormat.toLowerCase();
    const available = SUPPORTED_OUTPUTS_MAP[src];
    if (!available) return false;
    return available.some(out => out.format === tgt);
  }

  getSupportedOutputs(sourceFormat: string): FormatDescriptor[] {
    const src = sourceFormat.toLowerCase();
    return SUPPORTED_OUTPUTS_MAP[src] || [];
  }

  async convert(
    file: File,
    sourceFormat: string,
    targetFormat: string,
    options?: ConversionOptions,
    onProgress?: (progress: number, stage?: string) => void,
    abortSignal?: AbortSignal
  ): Promise<ConversionResult> {
    const startTime = performance.now();
    const src = sourceFormat.toLowerCase();
    const tgt = targetFormat.toLowerCase();

    if (abortSignal?.aborted) {
      throw new Error('Conversion cancelled by user.');
    }

    onProgress?.(15, 'Reading contact data...');
    const rawText = await file.text();

    if (abortSignal?.aborted) {
      throw new Error('Conversion cancelled by user.');
    }

    onProgress?.(45, 'Parsing contact records...');

    let convertedText = '';

    if (src === 'vcf' && tgt === 'csv') {
      const delimiter = options?.csvDelimiter || ',';
      convertedText = this.convertVcfToCsv(rawText, delimiter);
    } else if (src === 'csv' && tgt === 'vcf') {
      convertedText = this.convertCsvToVcf(rawText);
    } else {
      throw new Error(`Unsupported contact conversion direction: ${sourceFormat} to ${targetFormat}`);
    }

    if (abortSignal?.aborted) {
      throw new Error('Conversion cancelled by user.');
    }

    onProgress?.(85, 'Validating output format...');

    const targetMime = tgt === 'csv' ? 'text/csv;charset=utf-8' : 'text/vcard;charset=utf-8';
    const outputBlob = new Blob([convertedText], { type: targetMime });

    onProgress?.(100, 'Contact conversion complete!');

    const baseName = this.extractBaseName(file.name);
    const outputExtension = tgt;
    const outputFileName = `${baseName}.${outputExtension}`;

    return {
      success: true,
      blob: outputBlob,
      outputFormat: tgt,
      outputExtension,
      outputFileName,
      outputSize: outputBlob.size,
      durationMs: Math.round(performance.now() - startTime)
    };
  }

  private convertVcfToCsv(vcfText: string, delimiter: string = ','): string {
    const lines = vcfText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const contacts: ParsedContact[] = [];

    let current: Partial<ParsedContact> | null = null;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      // Handle vCard line unfolding (lines starting with space or tab continue previous property)
      while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
        i++;
        line += lines[i].trim();
      }

      if (line.toUpperCase() === 'BEGIN:VCARD') {
        current = {
          fullName: '',
          firstName: '',
          lastName: '',
          organization: '',
          jobTitle: '',
          phone: '',
          email: '',
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
          notes: ''
        };
        continue;
      }

      if (line.toUpperCase() === 'END:VCARD') {
        if (current && (current.fullName || current.phone || current.email || current.organization)) {
          contacts.push(current as ParsedContact);
        }
        current = null;
        continue;
      }

      if (!current) continue;

      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const propKeyFull = line.substring(0, colonIdx).toUpperCase();
      const propVal = line.substring(colonIdx + 1).trim();

      const propKey = propKeyFull.split(';')[0];

      if (propKey === 'FN') {
        current.fullName = this.unescapeVCard(propVal);
      } else if (propKey === 'N') {
        const parts = propVal.split(';').map(p => this.unescapeVCard(p.trim()));
        current.lastName = parts[0] || '';
        current.firstName = parts[1] || '';
        if (!current.fullName && (current.firstName || current.lastName)) {
          current.fullName = `${current.firstName} ${current.lastName}`.trim();
        }
      } else if (propKey === 'TEL') {
        const cleanPhone = this.unescapeVCard(propVal);
        current.phone = current.phone ? `${current.phone}; ${cleanPhone}` : cleanPhone;
      } else if (propKey === 'EMAIL') {
        const cleanEmail = this.unescapeVCard(propVal);
        current.email = current.email ? `${current.email}; ${cleanEmail}` : cleanEmail;
      } else if (propKey === 'ORG') {
        current.organization = this.unescapeVCard(propVal.replace(/;/g, ' - '));
      } else if (propKey === 'TITLE') {
        current.jobTitle = this.unescapeVCard(propVal);
      } else if (propKey === 'ADR') {
        const adrParts = propVal.split(';').map(p => this.unescapeVCard(p.trim()));
        // ADR format: post office box; extended address; street; city; region; postal code; country
        current.street = adrParts[2] || '';
        current.city = adrParts[3] || '';
        current.state = adrParts[4] || '';
        current.postalCode = adrParts[5] || '';
        current.country = adrParts[6] || '';
      } else if (propKey === 'NOTE') {
        current.notes = this.unescapeVCard(propVal);
      }
    }

    if (contacts.length === 0) {
      throw new Error('No valid vCard contact records found in the uploaded VCF file.');
    }

    // Generate CSV
    const headers = [
      'Full Name',
      'First Name',
      'Last Name',
      'Organization',
      'Job Title',
      'Phone',
      'Email',
      'Street Address',
      'City',
      'State',
      'Postal Code',
      'Country',
      'Notes'
    ];

    const escapeCsv = (val: string) => {
      if (!val) return '';
      if (val.includes(delimiter) || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const csvRows = [headers.join(delimiter)];

    for (const c of contacts) {
      const row = [
        escapeCsv(c.fullName),
        escapeCsv(c.firstName),
        escapeCsv(c.lastName),
        escapeCsv(c.organization),
        escapeCsv(c.jobTitle),
        escapeCsv(c.phone),
        escapeCsv(c.email),
        escapeCsv(c.street),
        escapeCsv(c.city),
        escapeCsv(c.state),
        escapeCsv(c.postalCode),
        escapeCsv(c.country),
        escapeCsv(c.notes)
      ];
      csvRows.push(row.join(delimiter));
    }

    return csvRows.join('\r\n') + '\r\n';
  }

  private convertCsvToVcf(csvText: string): string {
    const lines = this.parseCsvLines(csvText);
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one contact row.');
    }

    const headers = lines[0].map(h => h.trim().toLowerCase());

    const idxFullName = headers.findIndex(h => h.includes('full name') || h === 'name');
    const idxFirstName = headers.findIndex(h => h.includes('first name') || h === 'firstname' || h === 'given name');
    const idxLastName = headers.findIndex(h => h.includes('last name') || h === 'lastname' || h === 'family name' || h === 'surname');
    const idxPhone = headers.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('cell') || h === 'tel');
    const idxEmail = headers.findIndex(h => h.includes('email') || h === 'mail');
    const idxOrg = headers.findIndex(h => h.includes('organization') || h.includes('company') || h.includes('org'));
    const idxTitle = headers.findIndex(h => h.includes('title') || h.includes('job') || h.includes('role'));
    const idxStreet = headers.findIndex(h => h.includes('street') || h.includes('address'));
    const idxCity = headers.findIndex(h => h.includes('city'));
    const idxState = headers.findIndex(h => h.includes('state') || h.includes('region') || h.includes('province'));
    const idxPostal = headers.findIndex(h => h.includes('postal') || h.includes('zip'));
    const idxCountry = headers.findIndex(h => h.includes('country'));
    const idxNotes = headers.findIndex(h => h.includes('note') || h.includes('comment') || h.includes('description'));

    const vcards: string[] = [];

    for (let r = 1; r < lines.length; r++) {
      const row = lines[r];
      if (row.length === 0 || row.every(cell => !cell.trim())) continue;

      let fullName = idxFullName !== -1 ? (row[idxFullName] || '').trim() : '';
      const firstName = idxFirstName !== -1 ? (row[idxFirstName] || '').trim() : '';
      const lastName = idxLastName !== -1 ? (row[idxLastName] || '').trim() : '';
      const phone = idxPhone !== -1 ? (row[idxPhone] || '').trim() : '';
      const email = idxEmail !== -1 ? (row[idxEmail] || '').trim() : '';
      const org = idxOrg !== -1 ? (row[idxOrg] || '').trim() : '';
      const title = idxTitle !== -1 ? (row[idxTitle] || '').trim() : '';
      const street = idxStreet !== -1 ? (row[idxStreet] || '').trim() : '';
      const city = idxCity !== -1 ? (row[idxCity] || '').trim() : '';
      const state = idxState !== -1 ? (row[idxState] || '').trim() : '';
      const postal = idxPostal !== -1 ? (row[idxPostal] || '').trim() : '';
      const country = idxCountry !== -1 ? (row[idxCountry] || '').trim() : '';
      const notes = idxNotes !== -1 ? (row[idxNotes] || '').trim() : '';

      if (!fullName && (firstName || lastName)) {
        fullName = `${firstName} ${lastName}`.trim();
      }

      if (!fullName && !phone && !email) continue;

      const vcfBlock: string[] = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${this.escapeVCard(fullName || 'Unnamed Contact')}`,
        `N:${this.escapeVCard(lastName)};${this.escapeVCard(firstName)};;;`
      ];

      if (phone) {
        // Can be semicolon separated phone numbers
        const phones = phone.split(';').map(p => p.trim()).filter(Boolean);
        for (const p of phones) {
          vcfBlock.push(`TEL;TYPE=CELL:${p}`);
        }
      }

      if (email) {
        const emails = email.split(';').map(e => e.trim()).filter(Boolean);
        for (const e of emails) {
          vcfBlock.push(`EMAIL;TYPE=INTERNET:${e}`);
        }
      }

      if (org) {
        vcfBlock.push(`ORG:${this.escapeVCard(org)}`);
      }

      if (title) {
        vcfBlock.push(`TITLE:${this.escapeVCard(title)}`);
      }

      if (street || city || state || postal || country) {
        vcfBlock.push(`ADR;TYPE=HOME:;;${this.escapeVCard(street)};${this.escapeVCard(city)};${this.escapeVCard(state)};${this.escapeVCard(postal)};${this.escapeVCard(country)}`);
      }

      if (notes) {
        vcfBlock.push(`NOTE:${this.escapeVCard(notes)}`);
      }

      vcfBlock.push('END:VCARD');
      vcards.push(vcfBlock.join('\r\n'));
    }

    if (vcards.length === 0) {
      throw new Error('No valid contact entries found in CSV file.');
    }

    return vcards.join('\r\n') + '\r\n';
  }

  private parseCsvLines(csvText: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let insideQuotes = false;

    // Detect delimiter from first row (comma or semicolon)
    const firstLine = csvText.split(/\r?\n/)[0] || '';
    const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (insideQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            currentCell += '"';
            i++; // Skip escaped quote
          } else {
            insideQuotes = false;
          }
        } else {
          currentCell += char;
        }
      } else {
        if (char === '"') {
          insideQuotes = true;
        } else if (char === delimiter) {
          currentRow.push(currentCell.trim());
          currentCell = '';
        } else if (char === '\n' || char === '\r') {
          if (char === '\r' && nextChar === '\n') {
            i++;
          }
          currentRow.push(currentCell.trim());
          currentCell = '';
          if (currentRow.length > 0 && currentRow.some(c => c.length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
        } else {
          currentCell += char;
        }
      }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  private escapeVCard(val: string): string {
    return val
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  private unescapeVCard(val: string): string {
    return val
      .replace(/\\n/gi, '\n')
      .replace(/\\;/g, ';')
      .replace(/\\,/g, ',')
      .replace(/\\\\/g, '\\');
  }

  private extractBaseName(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return filename;
    return filename.substring(0, lastDot);
  }
}

