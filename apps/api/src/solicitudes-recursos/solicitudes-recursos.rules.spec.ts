import { Temporal } from 'temporal-polyfill';
import { solicitudesFixture } from '../../test/solicitudes-recursos-fixture.js';
import { aplicarCambios, fechaJava, seguimiento, TRANSICIONES } from './solicitudes-recursos.rules.js';

describe('Recursos: reglas exactas Spring Boot', () => {
    const ahora = Temporal.PlainDateTime.from('2026-10-06T12:00');
    for (const [actual, destinos] of Object.entries(TRANSICIONES)) {
        it.each(Object.keys(TRANSICIONES))(`${actual} -> %s valida matriz completa`, (nuevo) => {
            const s = solicitudesFixture().solicitud;
            Object.assign(s, { estadoRecurso: actual, proveedor: 'Proveedor', fechaEstimadaEntrega: ahora, fechaEntregaCliente: ahora });
            if (actual === nuevo || destinos.includes(nuevo)) expect(aplicarCambios(s, { estadoRecurso: nuevo }, ahora).estadoRecurso).toBe(nuevo);
            else expect(() => aplicarCambios(s, { estadoRecurso: nuevo }, ahora)).toThrow('Transición');
        });
    }
    it('original preferida; igualdad no es retraso, cruce de medianoche cuenta dia calendario', () => {
        const s = solicitudesFixture().solicitud;
        s.fechaEstimadaEntrega = ahora;
        expect(seguimiento(s, ahora).retrasada).toBe(false);
        s.fechaEstimadaEntregaOriginal = Temporal.PlainDateTime.from('2026-10-05T23:59');
        expect(seguimiento(s, Temporal.PlainDateTime.from('2026-10-06T00:01'))).toMatchObject({ retrasada: true, diasRetraso: 1 });
    });
    it.each(['RECIBIDO', 'ENTREGADO', 'CERRADO', 'CANCELADO'])('%s no tiene retraso activo', (estado) => {
        const s = solicitudesFixture().solicitud;
        Object.assign(s, { estadoRecurso: estado, fechaEstimadaEntrega: ahora.subtract({ days: 4 }), fechaRecepcion: ahora.subtract({ days: 2 }) });
        expect(seguimiento(s, ahora)).toMatchObject({ retrasada: false, diasRetraso: 2,
            situacionEntrega: estado === 'CANCELADO' ? 'CANCELADO' : 'RECIBIDO_CON_RETRASO' });
    });
    it('reprogramada futura; recepcion en tiempo; sin fecha', () => {
        const s = solicitudesFixture().solicitud;
        expect(seguimiento(s, ahora).situacionEntrega).toBe('SIN_FECHA');
        Object.assign(s, { fechaEstimadaEntregaOriginal: ahora.add({ days: 1 }), fechaEstimadaEntrega: ahora.add({ days: 2 }) });
        expect(seguimiento(s, ahora).situacionEntrega).toBe('REPROGRAMADO');
        Object.assign(s, { estadoRecurso: 'RECIBIDO', fechaRecepcion: ahora });
        expect(seguimiento(s, ahora)).toMatchObject({ situacionEntrega: 'RECIBIDO_EN_TIEMPO', diasRetraso: 0 });
    });
    it('fecha original antigua se captura antes de reprogramar y no cambia', () => {
        const s = solicitudesFixture().solicitud;
        s.fechaEstimadaEntrega = ahora;
        const n = aplicarCambios(s, { fechaEstimadaEntrega: '2026-10-08T12:00' }, ahora);
        expect(n.fechaEstimadaEntregaOriginal?.equals(ahora)).toBe(true);
        expect(aplicarCambios(n, { fechaEstimadaEntrega: '2026-10-09T12:00' }, ahora).fechaEstimadaEntregaOriginal?.equals(ahora)).toBe(true);
    });
    it('mismo estado omite validaciones adicionales como Spring', () => {
        const s = solicitudesFixture().solicitud;
        Object.assign(s, { estadoRecurso: 'CERRADO', proveedor: null, fechaEntregaCliente: null });
        expect(aplicarCambios(s, { estadoRecurso: 'cerrado' }, ahora).estadoRecurso).toBe('CERRADO');
    });
    it.each(['2026-10-06T12:00', '2026-10-06T12:00:01', '2026-10-06T12:00:00.120',
        '2026-10-06T12:00:00.123400', '2026-10-06T12:00:00.123456700'])('LocalDateTime.toString %s exacto', (v) => {
        expect(fechaJava(Temporal.PlainDateTime.from(v))).toBe(v);
    });
});
