import { Temporal } from 'temporal-polyfill';
import { crearEnlaceDTO, enlaceId, nombre, urlCompartida } from './enlaces-compartidos.rules.js';

describe('Reglas de enlaces compartidos', () => {
    const ahora = Temporal.PlainDateTime.from('2026-10-06T12:00');
    it('vigencia predeterminada siete días y correo normalizado', () => {
        expect(crearEnlaceDTO({ correoDestinatario: 'EXTERNO@example.test' }, ahora)).toEqual({ correoDestinatario: 'externo@example.test', fechaExpiracion: ahora.add({ days: 7 }) });
    });
    it('acepta exactamente treinta días', () => {
        expect(crearEnlaceDTO({ correoDestinatario: 'externo@example.test', fechaExpiracion: ahora.add({ days: 30 }).toString() }, ahora).fechaExpiracion).toEqual(ahora.add({ days: 30 }));
    });
    it.each(['2026-10-06T12:00', '2026-10-05T12:00', '2026-11-05T12:00:00.001', '2026-02-30T12:00', '2026-10-08T12:00Z', 'incorrecta'])('rechaza fecha %s', (fechaExpiracion) => {
        expect(() => crearEnlaceDTO({ correoDestinatario: 'externo@example.test', fechaExpiracion }, ahora)).toThrow();
    });
    it.each(['', 'sin-correo', 'correo@', ' correo@example.test '])('rechaza correo inválido %s', (correoDestinatario) => {
        expect(() => crearEnlaceDTO({ correoDestinatario }, ahora)).toThrow();
    });
    it.each(['0', '-1', '1.5', '9223372036854775808', '../1'])('rechaza id %s', (id) => { expect(() => enlaceId(id)).toThrow(); });
    it('conserva Long sin pérdida de precisión', () => { expect(enlaceId('9223372036854775807')).toBe(9223372036854775807n); });
    it('nombres y fallbacks', () => { expect(nombre({ nombre: ' A ', apellido: ' B ' })).toBe('A B'); expect(nombre(null)).toBe('Sin información'); });
    it('URL configurable y fallback', () => {
        const anterior = process.env['FRONTEND_URL'];
        try {
            delete process.env['FRONTEND_URL'];
            expect(urlCompartida('abc')).toBe('http://localhost:8081/ticket-compartido.html?token=abc');
            process.env['FRONTEND_URL'] = ' https://example.test/// ';
            expect(urlCompartida('abc')).toBe('https://example.test/ticket-compartido.html?token=abc');
        } finally { if (anterior === undefined) delete process.env['FRONTEND_URL']; else process.env['FRONTEND_URL'] = anterior; }
    });
});
