import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

/**
 * Data Cleaner utility for basic data cleaning operations
 */
class DataCleaner {
  constructor(config) {
    this.config = config;
  }

  /**
   * Load data from a file
   * @param {string} filePath - Path to the file
   */
  async loadData(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const ext = path.extname(filePath).toLowerCase();

      switch (ext) {
        case '.json':
          return JSON.parse(content);
        case '.csv':
          return parse(content, { columns: true, skip_empty_lines: true });
        case '.txt':
          return content;
        default:
          throw new Error(`Unsupported file format: ${ext}`);
      }
    } catch (error) {
      throw new Error(`Failed to load data: ${error.message}`);
    }
  }

  /**
   * Save data to a file
   * @param {string} filePath - Path to save the file
   * @param {any} data - Data to save
   */
  async saveData(filePath, data) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      let content;

      switch (ext) {
        case '.json':
          content = JSON.stringify(data, null, 2);
          break;
        case '.csv':
          content = stringify(data, { header: true });
          break;
        case '.txt':
          content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
          break;
        default:
          throw new Error(`Unsupported file format: ${ext}`);
      }

      await fs.writeFile(filePath, content, 'utf-8');
      return true;
    } catch (error) {
      throw new Error(`Failed to save data: ${error.message}`);
    }
  }

  /**
   * Remove empty rows from data
   * @param {Array} data - Array of data objects
   */
  removeEmptyRows(data) {
    if (!Array.isArray(data)) return data;
    
    return data.filter(row => {
      if (typeof row === 'object' && row !== null) {
        return Object.values(row).some(val => val !== null && val !== undefined && val !== '');
      }
      return row !== null && row !== undefined && row !== '';
    });
  }

  /**
   * Remove duplicate rows from data
   * @param {Array} data - Array of data objects
   */
  removeDuplicates(data) {
    if (!Array.isArray(data)) return data;
    
    const seen = new Set();
    return data.filter(row => {
      const key = JSON.stringify(row);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Normalize whitespace in strings
   * @param {any} data - Data to normalize
   */
  normalizeWhitespace(data) {
    if (typeof data === 'string') {
      return data.trim().replace(/\s+/g, ' ');
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.normalizeWhitespace(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const normalized = {};
      for (const [key, value] of Object.entries(data)) {
        normalized[key] = this.normalizeWhitespace(value);
      }
      return normalized;
    }
    
    return data;
  }

  /**
   * Apply all configured cleaning operations
   * @param {any} data - Data to clean
   */
  applyBasicCleaning(data) {
    let cleaned = data;

    if (this.config.removeEmptyRows) {
      cleaned = this.removeEmptyRows(cleaned);
    }

    if (this.config.removeDuplicates) {
      cleaned = this.removeDuplicates(cleaned);
    }

    if (this.config.normalizeWhitespace) {
      cleaned = this.normalizeWhitespace(cleaned);
    }

    return cleaned;
  }

  /**
   * Get statistics about the data
   * @param {any} data - Data to analyze
   */
  getDataStats(data) {
    if (Array.isArray(data)) {
      const stats = {
        totalRows: data.length,
        columns: data.length > 0 && typeof data[0] === 'object' && data[0] !== null
          ? Object.keys(data[0]).length 
          : 0,
        columnNames: data.length > 0 && typeof data[0] === 'object' && data[0] !== null
          ? Object.keys(data[0])
          : []
      };
      return stats;
    }
    
    return {
      type: typeof data,
      length: typeof data === 'string' ? data.length : 'N/A'
    };
  }
}

export default DataCleaner;
