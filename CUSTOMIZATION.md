# 🎨 Customization Guide

This guide helps you rebrand **Data Eater** for your own organization or use case. As stated in the LICENSE, you **must** remove or replace all branded content before distributing or sharing this software.

## 📋 Table of Contents

- [Why Customize?](#why-customize)
- [Brand References to Remove](#brand-references-to-remove)
- [Step-by-Step Rebranding](#step-by-step-rebranding)
- [Configuration Changes](#configuration-changes)
- [UI Text Changes](#ui-text-changes)
- [Asset Replacement](#asset-replacement)
- [Testing Your Changes](#testing-your-changes)

---

## 🎯 Why Customize?

Data Eater was originally built as a personalized gift for professionals at **Robertet** in **Grasse, France**. Throughout the codebase, you'll find:

- French language text and terminology
- References to "Robertet" (the company)
- References to "Grasse" (the location)
- Workflow assumptions specific to that organization
- AS400/mainframe references specific to their systems

While you're **free to use** this software, you **must adapt** these references before sharing or deploying for another organization.

---

## 🔍 Brand References to Remove

### Primary Brand: "Robertet"

Files containing "Robertet" references (line numbers are approximate and may change as code evolves - use search commands for accuracy):

**💡 Recommended: Use grep to find all references:**
```bash
grep -ri "robertet" src/
```

| File | Line(s) | Content |
|------|---------|---------|
| `index.html` | 10 | Page title: "Data Eater - Robertet Grasse" |
| `src-tauri/tauri.conf.json` | 3, 20 | App identifier and window title |
| `src/lib/constants.ts` | 4 | Company name in APP_CONFIG |
| `src/stores/mascotStore.ts` | ~line 30 | Recipe message referencing Robertet |
| `src/services/smartQueryService.ts` | ~line 15 | AI prompt context |
| `src/services/healthService.ts` | Comments | French/Robertet pattern comments |
| `src/components/FAQPage.tsx` | 19 | Introduction text |
| `src/components/GeoMapModal.tsx` | ~line 45 | Default map center (Grasse HQ coordinates) |
| `src/components/FixedWidthModal.tsx` | ~line 80 | Modal subtitle |
| `src/components/EmailValidatorModal.tsx` | ~line 120 | Example email domain |
| `src/components/ConditionalLogicModal.tsx` | ~line 95 | Placeholder example |
| `src/lib/errors.json` | ~line 35 | VPN/network error suggestion |

### Location: "Grasse"

Files containing "Grasse" references (line numbers are approximate and may change as code evolves - use search commands for accuracy):

**💡 Recommended: Use grep to find all references:**
```bash
grep -ri "grasse" src/
```

| File | Line(s) | Content |
|------|---------|---------|
| `index.html` | 10 | Page title |
| `src-tauri/tauri.conf.json` | 20 | Window title |
| `src/lib/constants.ts` | 5 | Timezone comment |
| `src/components/GeoMapModal.tsx` | ~line 45 | Default coordinates comment |

---

## 🔧 Step-by-Step Rebranding

### 1. Update Application Identity

**File: `package.json`**
```json
{
  "name": "your-app-name",  // Change from "app"
  "version": "1.2.0",
  // ... rest of config
}
```

**File: `src-tauri/tauri.conf.json`**
```json
{
  "identifier": "com.yourcompany.your-app-name",  // Change from "com.robertet.data-eater"
  "windows": [{
    "title": "Your App Name - Your Company"  // Change the title
  }]
}
```

**File: `index.html`**
```html
<title>Your App Name - Your Company</title>
```

### 2. Update Constants and Configuration

**File: `src/lib/constants.ts`**

```typescript
export const APP_CONFIG = {
  name: "Your App Name",        // Change from "Data Eater"
  version: "1.2.0",
  company: "Your Company",       // Change from "Robertet"
  timezone: "Your/Timezone",     // Change from "Europe/Paris"
};
```

### 3. Update Help and Documentation Text

**File: `src/components/FAQPage.tsx`**

Update the introduction section (around line 17-26):

```typescript
<p>
  Bonjour ! Je suis <strong>Le Glouton</strong> (Data Eater), 
  votre assistant personnel pour le nettoyage et la validation de données 
  chez [YOUR COMPANY NAME].  // Update this
</p>
```

Or translate to English/your language:

```typescript
<p>
  Hello! I'm <strong>The Glutton</strong> (Data Eater), 
  your personal assistant for data cleaning and validation 
  at [YOUR COMPANY NAME].
</p>
```

### 4. Update Geographic Defaults

**File: `src/components/GeoMapModal.tsx`**

Change the default map center (around line 45):

```typescript
const defaultCenter: [number, number] = points.length > 0 
  ? [points[0].lat, points[0].lng] 
  : [YOUR_LAT, YOUR_LONG]; // Change from [43.658, 6.926] (Grasse, France)
```

Common coordinates:
- New York: `[40.7128, -74.0060]`
- London: `[51.5074, -0.1278]`
- Tokyo: `[35.6762, 139.6503]`
- Sydney: `[-33.8688, 151.2093]`

### 5. Update Service Prompts

**File: `src/services/smartQueryService.ts`**

Update AI context prompts (around line 15):

```typescript
const systemPrompt = `
You are an expert Data Engineer assistant for [YOUR COMPANY].  // Update this
Help users query and analyze their data efficiently.
`;
```

### 6. Update Example Data

**File: `src/components/EmailValidatorModal.tsx`**

Update example email domain:

```typescript
<span className="text-[10px] text-text-muted">
  Ex: yourcompany.com  // Change from "robertet.com"
</span>
```

**File: `src/components/ConditionalLogicModal.tsx`**

Update placeholder examples:

```typescript
placeholder="Ex: YourCompany"  // Change from "Robertet"
```

### 7. Update Error Messages

**File: `src/lib/errors.json`**

Update company-specific error suggestions:

```json
{
  "suggestion": "Check your internet connection. If you're on a corporate VPN, verify there are no blocks."
  // Remove: "Si vous êtes sur un VPN d'entreprise (Robertet)..."
}
```

### 8. Update Mascot Messages

**File: `src/stores/mascotStore.ts`**

Update any company-specific messages:

```typescript
"Cleaning recipe applied."  // Instead of "Recette de nettoyage Robertet appliquée."
```

---

## 🎨 Asset Replacement

### Application Icons

Replace icons in `src-tauri/icons/` with your own:
- `icon.png` - Main application icon
- `icon.icns` - macOS icon
- `icon.ico` - Windows icon

### Logo and Branding Assets

Replace files in `public/`:
- `DE_ICON.png` - Main logo displayed in app header
- `favicon.ico` - Browser favicon
- `favicon-16x16.png` - Small favicon
- `favicon-32x32.png` - Medium favicon
- `apple-touch-icon.png` - iOS home screen icon

### Mascot Animations (Optional)

The app uses GIF animations for the mascot. You can replace these in `public/`:
- `idle_state.gif`
- `eating_state.gif`
- `cooking_state.gif`
- `detective_state.gif`
- `error_state.gif`
- `processing_state.gif`
- `query_chef_state.gif`
- `diff_inspect_state.gif`

---

## 🌐 Internationalization

The app is currently in French. To translate:

### Option 1: Use Existing i18next Setup

The app uses `react-i18next`. Add translation files:

1. Create `src/locales/en.json` for English
2. Create `src/locales/[lang].json` for other languages
3. Update i18n configuration to load translations

### Option 2: Direct Text Replacement

Search and replace French text in components:

```bash
# Search for French text
grep -r "Rechercher\|Filtres\|Exporter\|Sauvegarder" src/components/
```

Common translations:
- "Exporter" → "Export"
- "Sauvegarder" → "Save"
- "Rechercher" → "Search"
- "Filtres" → "Filters"
- "Quitter" → "Quit"

---

## 🧪 Testing Your Changes

After rebranding, verify:

### 1. **Build Test**
```bash
npm run build
npm run tauri build
```
Ensure no errors related to missing assets or broken references.

### 2. **Runtime Test**
```bash
npm run tauri dev
```

Check:
- [ ] Application title is correct
- [ ] Logo/icon displays properly
- [ ] No references to old branding in UI
- [ ] Help/FAQ text is updated
- [ ] Error messages don't mention old company
- [ ] Map defaults to correct location (if applicable)

### 3. **Search for Remaining References**

```bash
# Search for "Robertet"
grep -ri "robertet" src/

# Search for "Grasse"  
grep -ri "grasse" src/

# Check compiled output
grep -ri "robertet" dist/ 
```

### 4. **File Metadata**

Check that bundled app metadata is correct:
- Windows: Right-click .exe → Properties → Details
- macOS: Get Info on .app bundle
- Linux: Check .desktop file

---

## 📝 Checklist for Distribution

Before sharing your rebranded version:

- [ ] Updated `package.json` name and description
- [ ] Changed app identifier in `tauri.conf.json`
- [ ] Updated `APP_CONFIG` in `constants.ts`
- [ ] Replaced all logo/icon assets
- [ ] Updated page titles in `index.html`
- [ ] Removed/replaced company references in components
- [ ] Changed default map coordinates (if using geo features)
- [ ] Updated help/FAQ text
- [ ] Updated error messages
- [ ] Changed example data and placeholders
- [ ] Tested build process
- [ ] Verified no branded content remains in compiled output
- [ ] Updated README.md with your information

---

## 🆘 Need Help?

If you're unsure about a specific file or reference:

1. **Search the codebase**: `grep -ri "keyword" src/`
2. **Check this guide**: Review the tables above
3. **Open an issue**: Ask the community for guidance
4. **Fork and experiment**: Make changes in a branch and test

---

## 💡 Tips

- **Use find-and-replace carefully**: Some references might be in comments or non-critical areas
- **Keep the French if you want**: The language is part of the app's charm! Just remove company names
- **Test incrementally**: Make changes in small batches and test each time
- **Version control**: Commit after each major rebranding step
- **Document your changes**: Keep notes on what you customized for future updates

---

<div align="center">
  <p><strong>Happy Customizing! 🎨</strong></p>
  <p><em>Make Data Eater your own!</em></p>
</div>
