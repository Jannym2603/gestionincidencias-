import { Catch, HttpException } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { STATUS_CODES } from 'node:http';
import { Temporal } from 'temporal-polyfill';
import type { Response } from 'express';
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
    catch(error: unknown, host: ArgumentsHost) {
        const malformedJson = error instanceof SyntaxError && (error as SyntaxError & { type?: string }).type === 'entity.parse.failed';
        const status = error instanceof HttpException ? error.getStatus() : malformedJson ? 400 : 500;
        const data = error instanceof HttpException ? error.getResponse() : null;
        const originalMessage = typeof data === 'string' ? data : (data as { message?: unknown } | null)?.message ?? 'Internal server error';
        const wrappedJsonError = status === 400 && typeof originalMessage === 'string' && /^(Unexpected (?:end|token)|Expected (?:property|double-quoted)|Unterminated string|Bad (?:control|escaped)|Trailing characters)/.test(originalMessage);
        const message = malformedJson || wrappedJsonError ? 'JSON inválido.' : originalMessage;
        host.switchToHttp().getResponse<Response>().status(status).json({ timestamp: Temporal.Now.plainDateTimeISO().toString(), status, error: STATUS_CODES[status], message });
    }
}
