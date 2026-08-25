export interface ConversionHistoryRecord {
  id: string;
  inputFilename: string;
  outputFilename: string;
  inputSize: number;
  outputSize: number;
  sourceFormat: string;
  targetFormat: string;
  timestamp: number;
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
}

export class ConversionHistoryService {
  private static readonly STORAGE_KEY = 'ec_conversion_history';
  private static readonly MAX_RECORDS = 50;

  static getHistory(): ConversionHistoryRecord[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static addRecord(record: Omit<ConversionHistoryRecord, 'id' | 'timestamp'>): void {
    const history = this.getHistory();
    const newEntry: ConversionHistoryRecord = {
      ...record,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now()
    };

    const updated = [newEntry, ...history].slice(0, this.MAX_RECORDS);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore quota errors
    }
  }

  static clearHistory(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}
