import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainError } from '../errors/domain.errors';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const method = req.method;
    const url = req.url;
    const userId = (req as { user?: { userId?: string } }).user?.userId;

    if (exception instanceof DomainError) {
      const status = exception.httpStatus;

      this.logger.warn({
        event: 'domain_error',
        code: exception.code,
        message: exception.message,
        method,
        url,
        userId,
        statusCode: status,
        ...(exception.cause ? { cause: String(exception.cause) } : {}),
      });

      res.status(status).json({
        statusCode: status,
        code: exception.code,
        message: exception.message,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      this.logger.warn({
        event: 'http_exception',
        message: exception.message,
        method,
        url,
        userId,
        statusCode: status,
      });

      res.status(status).json(body);
      return;
    }

    // Erro inesperado — loga stack trace completo
    const message = exception instanceof Error ? exception.message : String(exception);
    const stack = exception instanceof Error ? exception.stack : undefined;

    this.logger.error({
      event: 'unexpected_error',
      message,
      method,
      url,
      userId,
      stack,
    });

    res.status(500).json({
      statusCode: 500,
      code: 'UNEXPECTED_ERROR',
      message: 'Ocorreu um erro interno. Tente novamente ou entre em contato com o suporte.',
    });
  }
}
