<!--
SYNC IMPACT REPORT
==================
Version change: (none — initial authoring from blank template) → 1.0.0
Added sections:
  - Core Principles (5 principles, each with multiple binding rules)
  - API Contract Standards (OpenAPI, pagination, parameter convention)
  - Development Workflow
  - Governance
Modified principles: N/A (first authored version)
Removed sections: N/A
Deferred TODOs: none — all placeholders resolved
-->

# finance-api Constitution

## Core Principles

### I. Hexagonal Architecture & Vendor Independence (NON-NEGOTIABLE)

The Open Finance provider (currently Pluggy) MUST NEVER be referenced directly outside of
`infrastructure/`. All access to banking data flows exclusively through the `OpenFinanceProvider`
port already established in the codebase. New code MUST NOT import the Pluggy SDK or any
provider-specific API outside of `infrastructure/`.

All new modules MUST follow the hexagonal layer structure already established in `open-finance/`:

- `domain/` — pure business logic; MUST NOT import NestJS, Prisma, or any external SDK
- `application/` — use cases and ports; imports domain only
- `infrastructure/` — adapters, Prisma, SDK clients; imports application ports
- `interface/` — controllers, DTOs, filters; imports application use cases

**Rationale**: The project must be able to swap Open Finance providers without touching business
logic. Hexagonal boundaries enforce this structurally, not by convention.

### II. Result/Either Error Handling (NON-NEGOTIABLE)

Every use case MUST return `Result<T, DomainError>`. Infrastructure exceptions MUST be caught
at the adapter boundary and mapped to typed domain errors (following the pattern of
`EmailAlreadyExistsError`, `InvalidCredentialsError`, `ConnectionNotFoundError`, etc.).
Controllers MUST NOT receive raw infrastructure exceptions.

The `AllExceptionsFilter` is authoritative for error serialization:
- `DomainError` → mapped HTTP response
- `HttpException` → passed through as-is
- Any other error → `UNEXPECTED_ERROR` with no stack trace exposed to the client

**Rationale**: Financial data handling requires predictable, typed error flows.
Unhandled infrastructure leaks erode trust and expose internal details.

### III. Security as a Hard Gate (NON-NEGOTIABLE)

Security requirements are blocking — no new product feature ships until the security baseline
is met. The following rules are unconditional:

- **No secrets in git**: No credential, key, or secret may be committed to the repository.
  `.env` MUST remain gitignored at all times. A `.env.example` with placeholder values only
  must exist and stay in sync with any new environment variable added to `.env`.
- **Refresh token + revocation**: JWT authentication MUST evolve to support refresh tokens with
  revocation capability. A 7-day access token without revocation is unacceptable for real
  financial data.
- **Rate limiting**: `/auth/register`, `/auth/login`, and `/connections/:id/sync` MUST have
  rate limiting applied before production use.
- **LGPD compliance**: An endpoint for deleting a user's connection and all associated personal
  data MUST exist before any real-data use.
- **Password policy**: Minimum password length is the single source of truth shared with the
  frontend — MUST be aligned to 8+ characters and kept identical across API validation and the
  frontend form. The current 6-character minimum MUST be updated.
- **Encryption at rest**: Sensitive banking credentials stored at rest MUST use AES-256-GCM via
  `CryptoService`. This pattern is mandatory for any new sensitive data field.

**Rationale**: The project handles real financial data. Portfolio status does not reduce security
obligations — the standard is identical to a production financial product.

### IV. Test Coverage for Every Use Case

Every new use case MUST have a unit test (`*.use-case.spec.ts`) following the patterns already
established in the codebase. Tests MUST cover: happy path, domain error paths, and adapter
failure paths.

Critical flows (auth, sync, banking connection) MUST have end-to-end coverage (Supertest),
following the pattern of `finance.e2e-spec.ts`.

All routes MUST use DTOs validated by `class-validator` with the global `ValidationPipe`.
No unvalidated input may reach a use case.

**Rationale**: The dual portfolio/production nature of this project requires that tests serve as
both quality gates and living documentation for future collaborators or employers reviewing
the codebase.

### V. Multi-tenancy & Data Isolation (NON-NEGOTIABLE)

Every sensitive or personal data access MUST be scoped by `userId` at the data-access layer.
Application-level filters are insufficient — Prisma queries for user data MUST always include
a `userId` filter. No query or model may assume a single-user environment.

Infrastructure decisions (cache, sync queues, pagination implementation details) MUST be deferred
until there is a concrete need — but no model or query may be designed in a way that assumes
single-tenancy or that would require data rearchitecting to become multi-tenant.

**Rationale**: The data model is already multi-tenant by design. Future growth must not require
a schema migration caused by a missing `userId` scope in an existing query.

## API Contract Standards

The following rules govern the public API contract:

- **Parameter convention**: Month-scoped resources MUST use path params (e.g., `/:yearMonth`),
  not query params. The existing `/statements/:yearMonth` pattern is the canonical standard.
  All routes currently using `?month=` query params MUST be migrated to path params.
- **Pagination**: Any list endpoint that can grow over time (transactions, investments,
  statements) MUST support pagination. Unbounded list endpoints for those resource types
  MUST NOT ship.
- **OpenAPI as source of truth**: Every endpoint MUST have complete OpenAPI documentation in
  Swagger (`/docs`), including request/response schemas and error examples. The frontend depends
  on this via `openapi-typescript` — undocumented endpoints break the type generation pipeline.
- **Auth contract alignment**: `AuthDto` MUST reflect exactly the fields the frontend sends.
  The `name` field collected by the registration form MUST be either persisted by the API or
  removed from the frontend form — silently discarding it is unacceptable.

## Development Workflow

- Architecture compliance is verified at code review time — any PR introducing Pluggy imports
  outside `infrastructure/`, or domain layer imports of NestJS/Prisma, MUST be rejected.
- Security items listed in Principle III are tracked as blocking issues; no feature PRs merge
  until the baseline is met.
- The Swagger contract is reviewed as part of every interface-layer PR.
- Each new module PR must include: domain entities, use case(s) with unit tests, at least one
  e2e test for the happy path, and complete OpenAPI annotations on all new endpoints.

## Governance

This constitution supersedes all other project practices and informal conventions. It represents
binding, non-negotiable decisions — not guidelines.

**Amendment procedure**:
1. Amendments are proposed by modifying this file with a version bump and updated Sync Impact
   Report header.
2. The rationale for any principle change MUST be documented inline.
3. Backward-incompatible changes (principle removal or redefinition) require a MAJOR version bump
   and a migration note explaining what existing code must be updated.

**Versioning policy**:
- MAJOR: Principle removed or fundamentally redefined in a backward-incompatible way.
- MINOR: New principle or section added; material expansion of existing guidance.
- PATCH: Clarifications, wording, typo fixes, non-semantic refinements.

**Compliance review**: Every PR touching `interface/`, `application/`, or `infrastructure/`
layers MUST be reviewed against this constitution. The author is responsible for self-certifying
compliance in the PR description.

**Version**: 1.0.0 | **Ratified**: 2026-08-28 | **Last Amended**: 2026-08-28
