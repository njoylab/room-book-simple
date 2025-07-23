# Contributing to Meeting Room Booking System

Thank you for your interest in contributing to the Meeting Room Booking System! This document provides guidelines and information for contributors.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style and Standards](#code-style-and-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Bug Reports](#bug-reports)
- [Feature Requests](#feature-requests)
- [Documentation](#documentation)

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js 18+** installed
- **Git** installed
- **npm** or **yarn** package manager
- **Airtable account** for development database
- **Slack app** configured for authentication

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/yourusername/room-book-simple.git
   cd room-book-simple
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/original-owner/room-book-simple.git
   ```

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

1. **Copy environment template**:
   ```bash
   cp .env.example .env.local
   ```

2. **Configure your environment variables**:
   - Set up Airtable tables and get API credentials
   - Create Slack app and get OAuth credentials
   - Generate a 32-character session secret

3. **Set up HTTPS tunnel** (required for Slack OAuth):
   ```bash
   npx ngrok http 3000
   ```

### 3. Database Setup

1. **Create Airtable base** with required tables:
   - `MeetingRooms` table
   - `Bookings` table

2. **Add sample data** for development:
   - Create 2-3 meeting rooms
   - Add some test bookings

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at your ngrok HTTPS URL.

## Code Style and Standards

### TypeScript

- **Strict mode**: Always enabled
- **Type annotations**: Required for function parameters and return types
- **Interfaces**: Use for object shapes and API responses
- **Enums**: Use for constants and status values

### React Components

- **Functional components**: Use hooks and functional components
- **Props interface**: Define TypeScript interfaces for all props
- **Default exports**: Use for page components
- **Named exports**: Use for utility components

### File Naming

- **Components**: PascalCase (e.g., `RoomCard.tsx`)
- **Utilities**: camelCase (e.g., `dateUtils.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.ts`)
- **Types**: PascalCase (e.g., `BookingTypes.ts`)

### Code Organization

```
app/
├── components/          # Reusable React components
├── api/                # API route handlers
├── book/               # Booking-specific pages
└── layout.tsx          # Root layout

lib/
├── airtable.ts         # Database operations
├── auth_server.ts      # Server-side authentication
├── auth_client.ts      # Client-side authentication
├── validation.ts       # Input validation schemas
└── types.ts           # TypeScript type definitions

utils/
├── date.ts            # Date manipulation utilities
└── slots.ts           # Time slot utilities
```

## Testing Guidelines

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- utils/__tests__/date.test.ts
```

### Writing Tests

#### Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'

describe('Component/Function Name', () => {
  beforeEach(() => {
    // Setup before each test
  })

  afterEach(() => {
    // Cleanup after each test
  })

  it('should do something specific', () => {
    // Test implementation
    expect(result).toBe(expected)
  })
})
```

#### Test Categories

1. **Unit Tests**: Test individual functions and components
2. **Integration Tests**: Test component interactions
3. **API Tests**: Test API endpoints
4. **Security Tests**: Test authentication and authorization
5. **End-to-End Tests**: Test complete user flows

#### Testing Best Practices

- **Arrange-Act-Assert**: Structure tests clearly
- **Descriptive names**: Use clear test descriptions
- **Mock external dependencies**: Don't test third-party services
- **Test edge cases**: Include error conditions and boundary values
- **Isolation**: Each test should be independent

### Test Coverage

- **Minimum coverage**: 80% for new code
- **Critical paths**: 100% coverage for authentication and booking logic
- **Utilities**: 100% coverage for date and slot utilities

## Pull Request Process

### 1. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Changes

- **Write code** following the style guidelines
- **Add tests** for new functionality
- **Update documentation** if needed
- **Test thoroughly** before submitting

### 3. Commit Changes

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add room availability indicator

- Add visual indicator for room availability status
- Update RoomCard component to show availability
- Add tests for availability logic
- Update documentation for new feature"
```

### 4. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:

- **Clear title** describing the change
- **Detailed description** of what was changed and why
- **Screenshots** for UI changes
- **Test results** showing all tests pass
- **Checklist** of completed items

### 5. PR Review Process

- **Code review**: Address reviewer feedback
- **Tests**: Ensure all tests pass
- **Documentation**: Update relevant docs
- **Squash commits**: Clean up commit history if needed

## Bug Reports

### Before Reporting

1. **Check existing issues** for similar problems
2. **Test in latest version** of the application
3. **Reproduce the issue** consistently

### Bug Report Template

```markdown
**Bug Description**
Brief description of the issue

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: [e.g., macOS, Windows, Linux]
- Browser: [e.g., Chrome, Firefox, Safari]
- Version: [e.g., 1.0.0]

**Additional Context**
Screenshots, logs, or other relevant information
```

## Feature Requests

### Before Requesting

1. **Check existing features** to avoid duplicates
2. **Consider the scope** and complexity
3. **Think about user value** and use cases

### Feature Request Template

```markdown
**Feature Description**
Clear description of the requested feature

**Use Case**
Why this feature is needed and how it would be used

**Proposed Implementation**
Optional: Suggestions for how to implement

**Alternatives Considered**
Other approaches that were considered

**Additional Context**
Any other relevant information
```

## Documentation

### Documentation Standards

- **Clear and concise**: Write for the target audience
- **Code examples**: Include practical examples
- **Keep updated**: Update docs when code changes
- **Multiple formats**: Use markdown, JSDoc, and inline comments

### Documentation Types

1. **README.md**: Project overview and setup
2. **API Documentation**: Endpoint documentation
3. **Component Documentation**: React component usage
4. **Deployment Guides**: Platform-specific deployment
5. **Contributing Guide**: This document

### JSDoc Comments

```typescript
/**
 * Formats a date object into a readable string
 * @param date - The date to format
 * @param format - The format to use (default: 'long')
 * @returns Formatted date string
 * @example
 * formatDate(new Date('2024-01-17'))
 * // Returns: 'Wednesday, January 17, 2024'
 */
export function formatDate(date: Date, format: 'short' | 'long' = 'long'): string {
  // Implementation
}
```

## Code Review Guidelines

### For Reviewers

- **Be constructive**: Provide helpful feedback
- **Check functionality**: Ensure the code works as intended
- **Review security**: Look for potential security issues
- **Verify tests**: Ensure adequate test coverage
- **Check documentation**: Verify docs are updated

### For Authors

- **Respond promptly**: Address review comments quickly
- **Be open to feedback**: Consider suggestions seriously
- **Explain decisions**: Provide context for design choices
- **Update as needed**: Make requested changes

## Release Process

### Versioning

We use [Semantic Versioning](https://semver.org/):

- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes (backward compatible)

### Release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Release notes written
- [ ] Deployment tested

## Getting Help

### Resources

- **Issues**: Use GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub discussions for questions
- **Documentation**: Check the docs folder for guides
- **Code**: Review existing code for examples

### Contact

- **Maintainers**: @maintainer-username
- **Slack**: #room-booking-dev (if available)
- **Email**: dev@yourcompany.com

## Recognition

Contributors will be recognized in:

- **README.md**: List of contributors
- **Release notes**: Credit for significant contributions
- **GitHub**: Contributor graph and profile

Thank you for contributing to the Meeting Room Booking System! 🎉