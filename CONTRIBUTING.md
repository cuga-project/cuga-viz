# Contributing to CugaViz

Thank you for your interest in contributing to CugaViz! We welcome contributions from the community.

## Developer Certificate of Origin (DCO)

By contributing to this project, you certify that you agree to the Developer Certificate of Origin (DCO) version 1.1:

```
Developer Certificate of Origin
Version 1.1

Copyright (C) 2004, 2006 The Linux Foundation and its contributors.

Everyone is permitted to copy and distribute verbatim copies of this
license document, but changing it is not allowed.


Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
```

### Sign Your Commits

To indicate your acceptance of the DCO, you must sign off on all commits using the `-s` or `--signoff` flag:

```bash
git commit -s -m "feat: add new feature"
```

This will add a "Signed-off-by" line to your commit message:

```
feat: add new feature

Signed-off-by: Your Name <your.email@example.com>
```

**Important:** All commits must be signed off. Pull requests with unsigned commits will not be accepted.

## Commit Message Conventions

We follow conventional commit guidelines for clear and structured commit messages:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```bash
git commit -s -m "feat: add trajectory graph visualization"
git commit -s -m "fix: resolve rendering issue in dashboard"
git commit -s -m "docs: update installation instructions"
```

## Development Setup

### Frontend
```bash
pnpm install
pnpm run dev
```

### Backend
```bash
cd server
uv pip install -e .
uv run cuga-viz start /path/to/logs
```

## Code Style

- Keep code comments minimal and focused
- Follow existing code patterns and conventions
- Use TypeScript for frontend code
- Use type hints for Python code

## Pull Request Process

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes with signed commits
4. Ensure code follows project conventions
5. Test your changes thoroughly
6. Submit a pull request with a clear description

## Questions?

Feel free to open an issue for any questions or concerns about contributing.

## License

By contributing to CugaViz, you agree that your contributions will be licensed under the Apache License 2.0.


