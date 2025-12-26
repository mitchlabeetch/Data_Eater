# 🍴 Data Eater

<div align="center">
  <img src="public/DE_ICON.png" alt="Data Eater Logo" width="120"/>
  
  <p><strong>A powerful, desktop data cleaning and transformation tool built with love as a gift 🎁</strong></p>
  
  <p>
    <img src="https://img.shields.io/badge/version-1.2.0-brightgreen" alt="Version"/>
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="License"/>
    <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Platform"/>
  </p>
</div>

---

## 📖 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Installation](#-installation)
- [Usage](#-usage)
- [Development](#-development)
- [Building](#-building)
- [Important Notes](#-important-notes)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 About

**Data Eater** (Le Glouton) is a desktop application designed to make data cleaning, validation, and transformation a breeze. Originally built as a thoughtful present for data professionals working with legacy systems, it specializes in:

- **CSV/Excel Processing**: Handle large datasets with ease
- **AS400/IBM iSeries Compatibility**: Prepare data for mainframe systems with proper encoding (Windows-1252) and format validation
- **Power BI Ready**: Export clean, structured data perfect for business intelligence tools
- **Zero Data Loss**: Your source files are never modified - all operations work on in-memory copies

This application runs entirely on your local machine, ensuring complete data privacy and security. No cloud uploads, no external dependencies for core functionality.

### 🎁 Built as a Present

Data Eater was originally created as a gift for data professionals, with an initial focus on a specific company's workflow. Feel free to fork, adapt, and customize it for your own use case!

---

## ✨ Features

### 🔧 Core Data Operations

- **Multi-format Import**: CSV, XLSX files with automatic encoding detection
- **Advanced Filtering**: Build complex filters with SQL-like syntax
- **Smart Search**: Real-time search across all columns
- **Column Operations**: Rename, reorder, delete, and transform columns
- **Sorting & Grouping**: Multi-column sorting and grouping capabilities

### 🛠️ Transformation Tools

- **Split Columns**: Divide columns by delimiter or pattern
- **Magic Join**: Intelligent data merging from multiple sources
- **Pivot/Unpivot**: Reshape data for different analytical needs
- **Regex Extractor**: Extract patterns using regular expressions
- **Formula Engine**: Create calculated columns with custom formulas
- **Conditional Logic**: Apply IF-THEN-ELSE rules to your data

### 🧹 Data Cleaning

- **Deduplication**: Remove duplicate rows intelligently
- **Name Splitter**: Parse full names into first/last components
- **Phone Standardizer**: Normalize phone numbers across formats
- **Email Validator**: Validate and clean email addresses
- **Currency Normalizer**: Handle multiple currency formats
- **Unit Converter**: Convert between measurement units
- **Mojibake Fixer**: Repair encoding issues and garbled text
- **Date Intelligence**: Parse and standardize various date formats

### 🏢 Legacy System Support

- **Mainframe Compatibility**: Special tools for AS400/IBM iSeries
- **Fixed-Width Parser**: Handle fixed-width format files (80/132 columns)
- **Encoding Control**: Export with Windows-1252 or other legacy encodings
- **Column Name Validation**: Ensure AS400 compliance (30 char limit, no special chars)

### 📊 Analysis & Visualization

- **Health Dashboard**: Get instant data quality metrics
- **Data Visualization**: Built-in charts and graphs
- **Geo Mapping**: Visualize location data on interactive maps
- **SQL Console**: Run custom SQL queries with DuckDB
- **DAX Support**: Create Power BI-compatible DAX measures
- **Date Dimension Generator**: Create calendar tables for time intelligence

### 💾 Export Options

- **Multiple Formats**: Export to CSV, XLSX, or SQL
- **Encoding Options**: Choose from various text encodings
- **Session Persistence**: Resume work where you left off
- **Backup System**: Automatic session backup and recovery

---

## 🔧 Technology Stack

**Data Eater** is built with modern, performant technologies:

### Frontend
- **[React 19](https://react.dev/)** - UI framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Vite](https://vitejs.dev/)** - Fast build tool and dev server
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first styling
- **[Framer Motion](https://www.framer.com/motion/)** - Smooth animations
- **[Glide Data Grid](https://github.com/glideapps/glide-data-grid)** - High-performance data grid

### Backend/Desktop
- **[Tauri 2](https://tauri.app/)** - Secure, lightweight desktop framework
- **[Rust](https://www.rust-lang.org/)** - Native backend for performance and security

### Data Processing
- **[DuckDB WASM](https://duckdb.org/)** - In-browser SQL analytics database
- **[ExcelJS](https://github.com/exceljs/exceljs)** - Excel file manipulation
- **[Zustand](https://github.com/pmndrs/zustand)** - State management

### Additional Libraries
- **[Leaflet](https://leafletjs.com/)** - Interactive mapping
- **[Recharts](https://recharts.org/)** - Data visualization
- **[i18next](https://www.i18next.com/)** - Internationalization support
- **[Luxon](https://moment.github.io/luxon/)** - Date/time handling
- **[Zod](https://zod.dev/)** - Schema validation

---

## 📥 Installation

### Prerequisites

- **Node.js** 18+ and npm (or yarn/pnpm)
- **Rust** 1.70+ and Cargo
- **System Dependencies** for Tauri (varies by OS)

#### Platform-Specific Setup

**Windows:**
```bash
# Install Visual Studio Build Tools or Visual Studio with C++ development tools
# Download from: https://visualstudio.microsoft.com/downloads/
```

**macOS:**
```bash
# Install Xcode Command Line Tools
xcode-select --install
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

### Install Data Eater

1. **Clone the repository:**
```bash
git clone https://github.com/mitchlabeetch/data_eater.git
cd data_eater
```

2. **Install dependencies:**
```bash
npm install
```

3. **Run in development mode:**
```bash
npm run tauri dev
```

---

## 🚀 Usage

### Getting Started

1. **Launch Data Eater**
   - Run the application from your desktop or via `npm run tauri dev`

2. **Import Your Data**
   - Drag and drop a CSV or XLSX file onto the main window
   - Or click "Sélectionner un Fichier" to browse

3. **Explore & Clean**
   - Use the toolbox on the right to access transformation tools
   - Search and filter your data using the top toolbar
   - Select columns to view statistics and apply operations

4. **Export Results**
   - Click "Exporter" or "Sauvegarder" in the header
   - Choose your format and encoding
   - Your original file remains untouched!

### Key Workflows

#### Preparing Data for AS400
1. Load your CSV/Excel file
2. Use "Mainframizer" tool to validate column names
3. Fix any encoding issues with "Mojibake Fixer"
4. Export with Windows-1252 encoding

#### Creating Power BI Datasets
1. Import your data source
2. Use "Date Dimension" to create calendar tables
3. Apply "DAX" tool to create measures
4. Export as XLSX or CSV

#### Cleaning Contact Data
1. Load customer/contact data
2. Apply "Phone Standardizer" for phone numbers
3. Use "Email Validator" to clean emails
4. Use "Name Splitter" to separate full names
5. Export cleaned dataset

---

## 💻 Development

### Project Structure

```
data_eater/
├── src/                    # React/TypeScript source code
│   ├── components/         # UI components (39 components)
│   ├── services/          # Business logic and data services
│   ├── stores/            # Zustand state management
│   ├── lib/               # Utilities and constants
│   └── assets/            # Images, fonts, etc.
├── src-tauri/             # Rust backend
│   ├── src/               # Tauri application code
│   ├── icons/             # Application icons
│   └── Cargo.toml         # Rust dependencies
├── public/                # Static assets
├── index.html             # HTML entry point
├── package.json           # Node dependencies
└── vite.config.ts         # Vite configuration
```

### Development Commands

```bash
# Start development server (web only)
npm run dev

# Start Tauri development (desktop app)
npm run tauri dev

# Build for production
npm run build

# Build Tauri desktop app
npm run tauri build

# Type checking
npm run tsc

# Preview production build
npm run preview
```

### Adding New Features

1. **Create Component**: Add to `src/components/`
2. **Add Service Logic**: Create service in `src/services/`
3. **State Management**: Use Zustand stores in `src/stores/`
4. **Register in App**: Import and add to `App.tsx`

### Debugging

- **Frontend**: Use browser DevTools (F12 in dev mode)
- **Backend**: Rust logs in terminal during `tauri dev`
- **SQL Queries**: Enable console logging in DuckDB service

---

## 🏗️ Building

### Desktop Application

Build production-ready installers for your platform:

```bash
# Build for your current platform
npm run tauri build

# Output locations:
# - Windows: src-tauri/target/release/bundle/msi/
# - macOS: src-tauri/target/release/bundle/dmg/
# - Linux: src-tauri/target/release/bundle/deb/ or appimage/
```

### Web Version (Optional)

While primarily a desktop app, you can build the web interface:

```bash
npm run build
# Output: dist/ directory
```

**Note**: Some features (file system access, native menus) will not work in web version.

---

## ⚠️ Important Notes

### 🏷️ Branded Content Warning

**This application was originally built as a gift for a specific company and contains branded content throughout the codebase and UI.**

Before sharing or deploying for your organization, you **MUST** remove or adapt all references to:

- **"Robertet"** - Company name
- **"Grasse"** - Location references  
- **Company-specific terminology**
- **Branded assets and imagery**

See [CUSTOMIZATION.md](./CUSTOMIZATION.md) for a complete list of files containing branded content and instructions on how to rebrand the application.

### 📋 Files to Customize

Key files containing brand references:
- `index.html` - Page title
- `src-tauri/tauri.conf.json` - App identifier and title
- `src/lib/constants.ts` - Company name and configuration
- `src/components/FAQPage.tsx` - Help text and descriptions
- `src/components/GeoMapModal.tsx` - Default map coordinates
- `src/services/smartQueryService.ts` - AI prompts
- Multiple other component files with French text and branding

### 🔒 Data Privacy

- All data processing happens **locally** on your machine
- No data is sent to external servers (except optional AI features if configured)
- Source files are **never modified** - operations work on in-memory copies
- Session data stored locally using LocalForage

---

## 🤝 Contributing

Contributions are welcome! This project is open source and free to use, modify, and distribute.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Guidelines

- Follow existing code style and conventions
- Add comments for complex logic
- Test your changes thoroughly
- Update documentation as needed

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

### License Summary

✅ **Permitted:**
- Commercial use
- Modification
- Distribution
- Private use

❌ **Required Before Distribution:**
- **Remove all branded content** (company names, specific terminology, branded assets)
- **Remove or replace personal references**

⚠️ **Important:**
While the MIT License permits distribution with branding, we strongly request that you remove company-specific and personal content before sharing, out of respect for the gift's personal nature.

🎯 **Why?**
This app was built as a personal gift with specific branding. While the code is open source, the branding and company-specific content are not intended for redistribution. Please customize it for your own use!

---

## 🙏 Acknowledgments

- Built with ❤️ as a gift for data professionals
- Inspired by powerful CLI tools like [qsv](https://github.com/jqnatividad/qsv) and [xan](https://github.com/medialab/xan)
- Powered by the amazing open-source community

---

## 📞 Support

If you encounter issues or have questions:

1. Check the in-app FAQ (click the "?" icon)
2. Review the [CUSTOMIZATION.md](./CUSTOMIZATION.md) guide
3. Open an issue on GitHub
4. Fork and adapt for your needs!

---

<div align="center">
  <p><strong>Happy Data Cleaning! 🍴</strong></p>
  <p><em>Remember: Always remove branded content before sharing!</em></p>
</div>
