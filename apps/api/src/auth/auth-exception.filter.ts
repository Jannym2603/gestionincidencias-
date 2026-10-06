import { Catch, HttpException } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { STATUS_CODES } from 'node:http';
import { Temporal } from 'temporal-polyfill';

@Catch(HttpException)
export class AuthExceptionFilter implements ExceptionFilter {
    catch(error: HttpException, host: ArgumentsHost) {
        const status = error.getStatus();
        const respuesta = error.getResponse();
        const message = typeof respuesta === 'string' ? respuesta : (respuesta as { message?: unknown }).message ?? error.message;
        host.switchToHttp().getResponse<Response>().status(status).json({
            timestamp: Temporal.Now.plainDateTimeISO().toString(), status, error: STATUS_CODES[status], message,
        });
    }
}
