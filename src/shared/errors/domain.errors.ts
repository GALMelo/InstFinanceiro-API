import { HttpStatus } from '@nestjs/common';

export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;

  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
  }
}

// ── Auth ────────────────────────────────────────────────────────────────────

export class EmailAlreadyExistsError extends DomainError {
  readonly code = 'EMAIL_ALREADY_EXISTS';
  readonly httpStatus = HttpStatus.CONFLICT;
}

export class InvalidCredentialsError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS';
  readonly httpStatus = HttpStatus.UNAUTHORIZED;
}

// ── Open Finance ─────────────────────────────────────────────────────────────

export class ConnectionNotFoundError extends DomainError {
  readonly code = 'CONNECTION_NOT_FOUND';
  readonly httpStatus = HttpStatus.NOT_FOUND;
}

export class BankProviderError extends DomainError {
  readonly code = 'BANK_PROVIDER_ERROR';
  readonly httpStatus = HttpStatus.BAD_GATEWAY;
}

export class SyncError extends DomainError {
  readonly code = 'SYNC_ERROR';
  readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
}

// ── Generic ──────────────────────────────────────────────────────────────────

export class UnexpectedError extends DomainError {
  readonly code = 'UNEXPECTED_ERROR';
  readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
}

export function toUnexpected(cause: unknown): UnexpectedError {
  const message = cause instanceof Error ? cause.message : String(cause);
  return new UnexpectedError(`Erro inesperado: ${message}`, cause);
}
