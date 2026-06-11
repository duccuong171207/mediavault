import {
  ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Response } from 'express';

/** Uniform error envelope: { statusCode, message, error, path, timestamp }. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload = exception instanceof HttpException
      ? exception.getResponse()
      : { message: 'Internal server error' };

    if (status >= 500) {
      this.log.error(`${req.method} ${req.url}`, (exception as Error)?.stack);
    }

    const body = typeof payload === 'string' ? { message: payload } : payload;
    res.status(status).json({
      statusCode: status,
      ...body,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
