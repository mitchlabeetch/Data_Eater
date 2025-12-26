# Contributing to Data Eater

First off, thank you for considering contributing to Data Eater! 🎉

This project was originally built as a gift, and we're excited to see it grow with the open-source community. All contributions are welcome, from bug fixes to new features, documentation improvements, and more.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

---

## 📜 Code of Conduct

This project follows a simple code of conduct:

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Help others learn and grow

---

## 🤝 How Can I Contribute?

### Reporting Bugs

Before creating a bug report:
1. Check the existing issues to avoid duplicates
2. Test with the latest version
3. Gather relevant information (OS, version, steps to reproduce)

**When reporting a bug, include:**
- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Your environment (OS, Node version, etc.)

### Suggesting Enhancements

We love new ideas! When suggesting features:
- Explain the use case clearly
- Describe the expected behavior
- Consider how it fits with existing features
- Include mockups or examples if helpful

### Your First Code Contribution

Unsure where to start? Look for:
- Issues labeled `good first issue`
- Issues labeled `help wanted`
- Documentation improvements
- Test coverage improvements

---

## 💻 Development Setup

1. **Fork and clone the repository:**
```bash
git clone https://github.com/YOUR-USERNAME/data_eater.git
cd data_eater
```

2. **Install dependencies:**
```bash
npm install
```

3. **Run development server:**
```bash
npm run tauri dev
```

4. **Create a branch:**
```bash
git checkout -b feature/my-awesome-feature
```

---

## 🔄 Pull Request Process

1. **Update documentation** if you're changing functionality
2. **Add tests** for new features when possible
3. **Follow coding standards** (see below)
4. **Test thoroughly** on your local machine
5. **Write clear commit messages**:
   ```
   feat: Add phone number validation for international formats
   
   - Added support for +XXX country codes
   - Updated PhoneStandardizer component
   - Added unit tests for new formats
   ```

6. **Update the README.md** if adding new features or dependencies

7. **Submit your PR** with:
   - Clear title describing the change
   - Description of what changed and why
   - Link to related issues (if any)
   - Screenshots for UI changes
   - Testing steps

### PR Review Process

- Maintainers will review your PR
- Address any feedback or requested changes
- Once approved, your PR will be merged!

---

## 🎨 Coding Standards

### TypeScript/React

- Use **TypeScript** for type safety
- Follow existing component patterns
- Use **functional components** with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks or services

### Code Style

- Use **2 spaces** for indentation
- Use **meaningful variable names**
- Add **comments** for complex logic
- Keep **functions small** and focused
- Use **async/await** over promises when possible

### File Organization

```
src/
├── components/     # React components
├── services/       # Business logic
├── stores/         # State management (Zustand)
├── lib/            # Utilities and helpers
└── assets/         # Static assets
```

### Naming Conventions

- **Components**: PascalCase (`DataGrid.tsx`)
- **Files**: camelCase for utilities (`dataService.ts`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_ROWS`)
- **Functions**: camelCase (`loadData`, `parseCSV`)
- **Interfaces**: PascalCase with descriptive names

---

## 🧪 Testing

Currently, the project doesn't have extensive automated tests, but we welcome contributions in this area!

### Manual Testing

Before submitting a PR, test:
1. **Build process**: `npm run build` succeeds
2. **Dev mode**: `npm run tauri dev` runs without errors
3. **Core functionality**: Load CSV, apply transforms, export
4. **Edge cases**: Large files, special characters, encoding issues
5. **Different platforms**: Test on Windows/macOS/Linux if possible

### Adding Tests

If you're adding tests (highly appreciated!):
- Place tests next to the code they test
- Use descriptive test names
- Cover edge cases and error conditions
- Mock external dependencies

---

## 📚 Documentation

Good documentation is just as important as good code!

### Code Comments

- Explain **why**, not **what**
- Document complex algorithms
- Add JSDoc comments for public functions
- Keep comments up-to-date with code changes

### README Updates

Update `README.md` when:
- Adding new features
- Changing installation steps
- Adding new dependencies
- Modifying usage instructions

### CUSTOMIZATION.md Updates

Update `CUSTOMIZATION.md` when:
- Adding new branded content
- Changing configuration structure
- Adding new assets

---

## 🌟 Feature Development Guidelines

### Before Starting a Large Feature

1. **Open an issue** to discuss the feature
2. **Get feedback** from maintainers
3. **Break it down** into smaller PRs if possible
4. **Consider backwards compatibility**

### UI/UX Changes

- Maintain consistency with existing design
- Consider accessibility (keyboard navigation, screen readers)
- Test responsive behavior
- Use existing color scheme and components
- Add animations sparingly and purposefully

### Data Processing Features

- Ensure **zero data loss** principle is maintained
- Work on in-memory copies, never modify source
- Handle large datasets efficiently
- Provide clear error messages
- Add progress indicators for long operations

### Legacy System Support

If adding features for AS400/mainframe:
- Validate encoding compatibility (Windows-1252)
- Check field length limits
- Test special character handling
- Document mainframe-specific requirements

---

## 🔧 Working with the Stack

### React/TypeScript

- Leverage TypeScript's type system
- Use proper typing for props and state
- Avoid `any` types when possible

### Zustand (State Management)

- Keep stores focused and modular
- Use selectors to prevent unnecessary re-renders
- Document store structure and actions

### DuckDB

- Write efficient SQL queries
- Handle errors gracefully
- Test with various data types and sizes

### Tauri

- Keep Rust code simple and focused
- Document any platform-specific code
- Test native functionality thoroughly

---

## 🐛 Debugging Tips

### Frontend Issues
- Use React DevTools
- Check browser console for errors
- Use `console.log` for quick debugging
- Use TypeScript to catch errors early

### Backend/Tauri Issues
- Check terminal output during `tauri dev`
- Look for Rust compilation errors
- Test native APIs carefully

### Data Processing Issues
- Test with small datasets first
- Log SQL queries for debugging
- Check encoding and special characters
- Verify edge cases (empty strings, nulls, etc.)

---

## 📦 Dependencies

### Adding New Dependencies

Before adding a dependency:
1. Check if existing dependencies can solve the problem
2. Consider package size and maintenance status
3. Check license compatibility (MIT preferred)
4. Document why it's needed in PR description

### Updating Dependencies

- Keep dependencies up-to-date for security
- Test thoroughly after updates
- Update documentation if API changes

---

## 🚀 Release Process

(For maintainers)

1. Update version in `package.json`
2. Update version in `src-tauri/Cargo.toml`
3. Update version in `src/lib/constants.ts`
4. Update CHANGELOG.md (if exists)
5. Create git tag: `git tag v1.x.x`
6. Push tag: `git push origin v1.x.x`
7. Build release binaries
8. Create GitHub release with notes

---

## ❓ Questions?

- Open an issue for questions
- Join discussions in existing issues
- Check the FAQ in the app
- Review existing code for patterns

---

## 🙏 Recognition

Contributors will be:
- Added to CONTRIBUTORS.md (if we create one)
- Mentioned in release notes
- Appreciated by the community!

---

<div align="center">
  <p><strong>Thank you for contributing to Data Eater! 🍴</strong></p>
  <p><em>Together we can make data cleaning easier for everyone!</em></p>
</div>
