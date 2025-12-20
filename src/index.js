import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import LLMManager from './modules/llmManager.js';
import DataCleaner from './modules/dataCleaner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main DataEater application class
 */
class DataEater {
  constructor() {
    this.config = null;
    this.llmManager = null;
    this.dataCleaner = null;
  }

  /**
   * Initialize the application
   */
  async initialize() {
    try {
      // Load configuration
      const configPath = path.join(__dirname, '../config/default.json');
      const configData = await fs.readFile(configPath, 'utf-8');
      this.config = JSON.parse(configData);

      // Initialize managers
      this.llmManager = new LLMManager(this.config.llm);
      this.dataCleaner = new DataCleaner(this.config.cleaning);

      console.log('DataEater initialized successfully');
      
      // Check LLM availability
      const llmAvailable = await this.llmManager.checkAvailability();
      if (!llmAvailable) {
        console.warn('Warning: LLM not available. Some features may be limited.');
        console.warn('Make sure Ollama is running: https://ollama.ai/');
      }

      return true;
    } catch (error) {
      console.error('Initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Process a file with basic and LLM-based cleaning
   * @param {string} inputPath - Path to input file
   * @param {string} outputPath - Path to output file
   * @param {Object} options - Processing options
   */
  async processFile(inputPath, outputPath, options = {}) {
    console.log(`\nProcessing file: ${inputPath}`);
    
    try {
      // Load data
      console.log('Loading data...');
      const data = await this.dataCleaner.loadData(inputPath);
      
      // Show initial stats
      const initialStats = this.dataCleaner.getDataStats(data);
      console.log('Initial data stats:', initialStats);

      // Apply basic cleaning
      console.log('Applying basic cleaning...');
      let cleaned = this.dataCleaner.applyBasicCleaning(data);

      // Apply LLM-based cleaning if requested and available
      if (options.useLLM && this.llmManager) {
        console.log('Applying LLM-based cleaning...');
        console.log('Note: LLM processing currently processes sample data for demonstration.');
        
        try {
          // For array data, process in chunks
          if (Array.isArray(cleaned) && cleaned.length > 0) {
            // Process first few rows as example
            // Note: In production, you'd want to process all data in chunks
            const sample = cleaned.slice(0, Math.min(5, cleaned.length));
            const sampleText = JSON.stringify(sample, null, 2);
            const cleanedSample = await this.llmManager.cleanText(sampleText, options.context);
            
            console.log('LLM cleaning applied to sample data (first 5 rows)');
            console.log('Note: Full dataset processing would require chunked processing');
          } else if (typeof cleaned === 'string') {
            cleaned = await this.llmManager.cleanText(cleaned, options.context);
            console.log('LLM cleaning applied to text data');
          }
        } catch (error) {
          console.warn('LLM cleaning failed, continuing with basic cleaning:', error.message);
        }
      }

      // Show final stats
      const finalStats = this.dataCleaner.getDataStats(cleaned);
      console.log('Final data stats:', finalStats);

      // Save cleaned data
      console.log('Saving cleaned data...');
      await this.dataCleaner.saveData(outputPath, cleaned);
      
      console.log(`✓ Successfully processed: ${outputPath}`);
      return true;
    } catch (error) {
      console.error(`✗ Processing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process all files in the input directory
   * @param {Object} options - Processing options
   */
  async processDirectory(options = {}) {
    const inputDir = path.resolve(this.config.data.inputDir);
    const outputDir = path.resolve(this.config.data.outputDir);

    console.log('\n=== DataEater Batch Processing ===');
    console.log(`Input directory: ${inputDir}`);
    console.log(`Output directory: ${outputDir}`);

    try {
      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });

      // Get all files in input directory
      const files = await fs.readdir(inputDir);
      const dataFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase().slice(1);
        return this.config.data.supportedFormats.includes(ext);
      });

      if (dataFiles.length === 0) {
        console.log('No supported data files found in input directory');
        return;
      }

      console.log(`Found ${dataFiles.length} file(s) to process\n`);

      // Process each file
      for (const file of dataFiles) {
        const inputPath = path.join(inputDir, file);
        const outputPath = path.join(outputDir, `cleaned_${file}`);
        
        try {
          await this.processFile(inputPath, outputPath, options);
        } catch (error) {
          console.error(`Failed to process ${file}:`, error.message);
        }
      }

      console.log('\n=== Processing Complete ===');
    } catch (error) {
      console.error('Directory processing failed:', error.message);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const app = new DataEater();
  
  try {
    await app.initialize();
    
    // Check for command line arguments
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      // Default: process directory
      await app.processDirectory({ useLLM: false });
    } else if (args[0] === '--help' || args[0] === '-h') {
      console.log(`
DataEater - LLM-reliant data cleaning application

Usage:
  node src/index.js [options] [inputFile] [outputFile]

Options:
  --help, -h          Show this help message
  --llm              Enable LLM-based cleaning
  --batch            Process all files in input directory (default)

Examples:
  node src/index.js                                    # Process all files in data/input
  node src/index.js --llm                              # Process with LLM cleaning
  node src/index.js input.csv output.csv              # Process specific file
  node src/index.js --llm input.csv output.csv        # Process specific file with LLM
      `);
    } else if (args.includes('--llm') || args.length >= 2) {
      const useLLM = args.includes('--llm');
      const fileArgs = args.filter(arg => !arg.startsWith('--'));
      
      if (fileArgs.length >= 2) {
        // Process specific files
        await app.processFile(fileArgs[0], fileArgs[1], { useLLM });
      } else {
        // Process directory with LLM
        await app.processDirectory({ useLLM });
      }
    } else {
      await app.processDirectory({ useLLM: false });
    }
  } catch (error) {
    console.error('Application error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url.startsWith('file:') && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}

export default DataEater;
