# DataEater 🍽️

**LLM-reliant data cleaning application for local execution**

DataEater is a powerful JavaScript application that leverages locally-run Large Language Models (LLMs) to clean, standardize, and process your data files. It combines traditional data cleaning techniques with AI-powered transformations to handle messy, inconsistent data.

Pour Maman ❤️

## Features

- **Local LLM Integration**: Uses Ollama for secure, private LLM-based data processing
- **Multiple Format Support**: CSV, JSON, and TXT file processing
- **Basic Data Cleaning**: 
  - Remove empty rows
  - Remove duplicates
  - Normalize whitespace
- **AI-Powered Cleaning**: 
  - Intelligent text standardization
  - Extract structured data from unstructured text
  - Context-aware data validation and fixing
- **Batch Processing**: Process entire directories automatically
- **Configurable**: Easy-to-modify JSON configuration
- **CLI Interface**: Simple command-line usage

## Prerequisites

- **Node.js** (v14 or higher)
- **Ollama** (for LLM features) - https://ollama.ai/

## Installation

1. Clone the repository:
```bash
git clone https://github.com/mitchlabeetch/data_eater.git
cd data_eater
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Install and set up Ollama for LLM features:
```bash
# Install Ollama from https://ollama.ai/

# Pull the default model (llama2)
ollama pull llama2

# Start Ollama (if not already running)
ollama serve
```

## Quick Start

### Run the demo:
```bash
npm run example
```

This will process the sample files in `data/input/` and output cleaned versions to `data/output/`.

### Process your own data:

1. Place your data files in the `data/input/` directory
2. Run the application:

```bash
# Basic cleaning (no LLM)
npm start

# With LLM-based cleaning
node src/index.js --llm

# Process specific file
node src/index.js input.csv output.csv

# Process specific file with LLM
node src/index.js --llm input.csv output.csv
```

## Usage

### Command Line Options

```bash
node src/index.js [options] [inputFile] [outputFile]

Options:
  --help, -h          Show help message
  --llm               Enable LLM-based cleaning
  --batch             Process all files in input directory (default)

Examples:
  node src/index.js                                    # Process all files
  node src/index.js --llm                              # Process with LLM
  node src/index.js input.csv output.csv              # Process specific file
  node src/index.js --llm input.csv output.csv        # Process with LLM
```

### Programmatic Usage

```javascript
import DataEater from './src/index.js';

const app = new DataEater();
await app.initialize();

// Process a single file
await app.processFile('input.csv', 'output.csv', { 
  useLLM: true,
  context: 'Customer data requiring standardization'
});

// Process directory
await app.processDirectory({ useLLM: true });
```

## Configuration

Edit `config/default.json` to customize behavior:

```json
{
  "llm": {
    "model": "llama2",                    // Ollama model to use
    "host": "http://127.0.0.1:11434",     // Ollama host
    "temperature": 0.7,                    // LLM temperature
    "maxTokens": 2048                      // Max tokens per request
  },
  "data": {
    "inputDir": "./data/input",            // Input directory
    "outputDir": "./data/output",          // Output directory
    "supportedFormats": ["csv", "json", "txt"]
  },
  "cleaning": {
    "removeEmptyRows": true,               // Remove empty rows
    "removeDuplicates": true,              // Remove duplicates
    "normalizeWhitespace": true            // Normalize spacing
  }
}
```

## Project Structure

```
data_eater/
├── src/
│   ├── index.js                  # Main application entry point
│   └── modules/
│       ├── llmManager.js         # LLM integration and AI operations
│       └── dataCleaner.js        # Data cleaning utilities
├── config/
│   └── default.json              # Configuration file
├── data/
│   ├── input/                    # Place input files here
│   │   ├── sample.csv
│   │   ├── sample.json
│   │   └── sample.txt
│   └── output/                   # Cleaned files appear here
├── examples/
│   └── demo.js                   # Demo script
├── package.json
└── README.md
```

## Modules

### LLMManager
Handles all LLM interactions:
- `checkAvailability()` - Verify Ollama is running
- `generate(prompt)` - Generate LLM responses
- `cleanText(text, context)` - Clean and standardize text
- `extractStructuredData(text, format)` - Extract structured data
- `validateAndFix(data, rules)` - Validate against rules

### DataCleaner
Handles traditional data cleaning:
- `loadData(filePath)` - Load files (CSV, JSON, TXT)
- `saveData(filePath, data)` - Save cleaned data
- `removeEmptyRows(data)` - Remove empty rows
- `removeDuplicates(data)` - Remove duplicates
- `normalizeWhitespace(data)` - Normalize spacing
- `getDataStats(data)` - Get data statistics

## Examples

### Example 1: Clean CSV with duplicates and formatting issues

Input (`data/input/dirty.csv`):
```csv
name,email,age
  John Doe  ,john@email.com,30
John Doe,john@email.com,30
Jane Smith,jane@email.com,
```

Run:
```bash
node src/index.js
```

Output (`data/output/cleaned_dirty.csv`):
```csv
name,email,age
John Doe,john@email.com,30
Jane Smith,jane@email.com,
```

### Example 2: Extract structured data with LLM

```javascript
import DataEater from './src/index.js';

const app = new DataEater();
await app.initialize();

const unstructuredText = `
  John Smith works at Acme Corp, email: john@acme.com, phone: 555-1234
  Jane Doe, jane@example.com, works at TechStart, 555-5678
`;

const structured = await app.llmManager.extractStructuredData(
  unstructuredText, 
  'json'
);
```

## Troubleshooting

### "Ollama not available"
- Make sure Ollama is installed: https://ollama.ai/
- Start Ollama: `ollama serve`
- Verify it's running: `curl http://127.0.0.1:11434`

### "Model not found"
- Pull the model: `ollama pull llama2`
- Or change the model in `config/default.json`

### No files processed
- Ensure files are in `data/input/`
- Check file extensions match `supportedFormats` in config
- Verify file permissions

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

ISC

## Acknowledgments

Built with:
- [Ollama](https://ollama.ai/) - Run LLMs locally
- [csv-parse](https://csv.js.org/parse/) - CSV parsing
- [csv-stringify](https://csv.js.org/stringify/) - CSV generation

---

Made with ❤️ for data cleaning enthusiasts
