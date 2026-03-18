import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ThrottlerException } from '@nestjs/throttler';

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(exception: ThrottlerException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    res.status(HttpStatus.TOO_MANY_REQUESTS).json({
      statusCode: 429,
      error: 'Too Many Requests',
      message:
        'Слишком много попыток входа или регистрации. Попробуйте через 15 минут.',
    });
  }
}
