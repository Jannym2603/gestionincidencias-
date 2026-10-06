import 'reflect-metadata';
import { randomBytes } from 'node:crypto';
import { vi } from 'vitest';

// Ephemeral test key: never use credentials from the local environment.
process.env['JWT_SECRET'] = randomBytes(32).toString('hex');
process.env['MAIL_USERNAME'] = '';
process.env['MAIL_PASSWORD'] = '';
process.env['SUPPORT_EMAIL'] = '';
process.env['MAIL_COPY_SUPPORT'] = 'false';

// Even tests with simulated credentials must never contact an SMTP server.
vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn(() => ({
    sendMail: vi.fn(async () => ({ messageId: 'simulado' })), close: vi.fn(),
})) } }));

// Fail closed if a test accidentally attempts to query the real database.
vi.mock('../src/prisma/db.js', () => ({ db: { orm: { public: {} } } }));

// Las suites de dominio aíslan la identidad; la suite identidad.spec prueba el servicio real.
vi.mock('../src/security/identidad.service.js', () => ({
    normalizarRol: (value: unknown) => typeof value === 'string' ? value.trim().toUpperCase().replace(/^ROLE_/, '') : '',
    IdentidadService: class { async resolver(claims: Record<string, unknown>) { return claims; } },
}));
