import { Temporal } from 'temporal-polyfill';
import { reportesFixture } from '../../test/reportes-fixture.js';
import { comentariosPermitidos, conteosTickets, conteosTipos, esOperativo, filtrarTickets, filtrosReporte,
    resumenRecursos, usuariosRelacionados } from './reportes.rules.js';

describe('Reglas de reportes Spring y contratos existentes del frontend', () => {
    it('equalsIgnoreCase sin trim mantiene estados/prioridades historicos y ceros', () => {
        const f = reportesFixture();
        Object.assign(f.rows[0]!, { estado: 'nuevo', prioridad: 'p1_critica' });
        Object.assign(f.rows[1]!, { estado: ' NUEVO ', prioridad: ' P1_CRITICA ' });
        expect(conteosTickets(f.rows, 'estado').find((c) => c.nombre === 'NUEVO')!.total).toBe(8);
        expect(conteosTickets(f.rows, 'estado').find((c) => c.nombre === 'ASIGNADO')!.total).toBe(0);
        expect(conteosTickets(f.rows, 'prioridad').find((c) => c.nombre === 'P1_CRITICA')!.total).toBe(2);
        expect(conteosTickets([], 'estado')).toHaveLength(5);
        expect(conteosTickets([], 'prioridad')).toHaveLength(4);
    });
    it('agrupa tipo por nombre exacto, conserva orden, descarta null y usa Map seguro', () => {
        const f = reportesFixture();
        Object.assign(f.rows[0]!, { tipoIncidencia: null });
        Object.assign(f.rows[1]!, { tipoIncidencia: { nombre: null } });
        Object.assign(f.rows[2]!, { tipoIncidencia: { nombre: '__proto__' } });
        Object.assign(f.rows[3]!, { tipoIncidencia: { nombre: '' } });
        Object.assign(f.rows[4]!, { tipoIncidencia: { nombre: 'hardware' } });
        expect(conteosTipos(f.rows)).toEqual([{ nombre: '__proto__', total: 1 }, { nombre: '', total: 1 },
            { nombre: 'hardware', total: 1 }, { nombre: 'Recursos', total: 8 }, { nombre: 'Hardware', total: 1 }]);
    });
    it('usuarios relacionados deduplicados incluyen actor aun sin tickets', () => {
        const f = reportesFixture();
        expect(usuariosRelacionados([], 30)).toBe(1);
        expect(usuariosRelacionados(f.rows.slice(0, 2), 10)).toBe(2);
        expect(usuariosRelacionados(f.rows.slice(0, 2), 30)).toBe(3);
        Object.assign(f.rows[0]!, { cliente: null, agenteAsignado: null });
        expect(usuariosRelacionados(f.rows.slice(0, 1), 30)).toBe(1);
    });
    it('CLIENTE excluye solo INTERNO; null/otros tipos cuentan como Spring', () => {
        const rows = ['PUBLICO', ' interno ', 'OTRO', null].map((tipoComentario) => ({ ticketId: 1, tipoComentario }));
        rows.push({ ticketId: 2, tipoComentario: 'PUBLICO' });
        expect(comentariosPermitidos(rows, [1], 'CLIENTE')).toBe(3);
        expect(comentariosPermitidos(rows, [1], 'ADMIN')).toBe(4);
        expect(comentariosPermitidos(rows, [], 'ADMIN')).toBe(0);
    });
    it('filtra compania y proyecto mediante AND y tolera relaciones ausentes', () => {
        const f = reportesFixture();
        expect(filtrarTickets(f.rows, { companiaId: 1, proyectoId: 1 })).toHaveLength(13);
        expect(filtrarTickets(f.rows, { companiaId: 2, proyectoId: 1 })).toHaveLength(0);
        Object.assign(f.rows[0]!, { proyecto: null });
        expect(filtrarTickets(f.rows, { companiaId: null, proyectoId: 1 })).toHaveLength(12);
    });
    it('operativos legacy y nombres normalizados como dashboard', () => {
        const f = reportesFixture();
        Object.assign(f.rows[0]!, { tipoAtencion: null });
        expect(esOperativo(f.rows[0]!)).toBe(true);
        Object.assign(f.rows[0]!, { tipoAtencion: ' recurso_externo ' });
        expect(esOperativo(f.rows[0]!)).toBe(false);
    });
    it('resumen de recursos vacio contiene numeros finitos y ceros', () => {
        const result = resumenRecursos([]);
        expect(Object.values(result).every((v) => v === 0 && Number.isFinite(v))).toBe(true);
        expect(Object.keys(result)).toHaveLength(12);
    });
    it('proximas entregas incluye ambos limites y excluye estados finalizados', () => {
        const f = reportesFixture();
        const ahora = Temporal.PlainDateTime.from('2026-10-06T12:00');
        const base = f.solicitudes[0]!;
        const rows = [ahora, ahora.add({ days: 7 }), ahora.subtract({ nanoseconds: 1 }), ahora.add({ days: 7, nanoseconds: 1 })]
            .map((fechaEstimadaEntrega) => ({ ...base, fechaEstimadaEntrega }));
        rows.push({ ...base, estadoRecurso: 'RECIBIDO' as typeof base.estadoRecurso, fechaEstimadaEntrega: ahora });
        expect(resumenRecursos(rows, ahora).proximasEntregas).toBe(2);
    });
    it('retraso original no desaparece al reprogramar, RECIBIDO detiene retraso activo', () => {
        const f = reportesFixture();
        const ahora = Temporal.PlainDateTime.from('2026-10-06T12:00');
        const base = { ...f.solicitudes[0]!, fechaEstimadaEntregaOriginal: ahora.subtract({ days: 2 }), fechaEstimadaEntrega: ahora.add({ days: 2 }) };
        const result = resumenRecursos([base, { ...base, estadoRecurso: 'RECIBIDO' as typeof base.estadoRecurso }], ahora);
        expect(result.retrasadas).toBe(1);
        expect(result.proximasEntregas).toBe(1);
    });
    it('promedio proveedor usa dias fraccionarios y excluye fechas faltantes o invertidas', () => {
        const f = reportesFixture();
        const fecha = Temporal.PlainDateTime.from('2026-10-06T12:00');
        const base = f.solicitudes[0]!;
        const rows = [0, 36].map((hours) => ({ ...base, fechaSolicitudProveedor: fecha, fechaRecepcion: fecha.add({ hours }) }));
        rows.push({ ...base, fechaSolicitudProveedor: fecha, fechaRecepcion: fecha.subtract({ hours: 1 }) });
        expect(resumenRecursos([...rows, base], fecha).promedioDiasProveedor).toBe(0.75);
    });
    it.each([{ proyectoId: ['1', '2'] }, { companiaId: {} }, { proyectoId: '1.2' }, { companiaId: 'Infinity' },
        { proyectoId: '0' }, { proyectoId: '-1' }, { proyectoId: '2147483648' }])('filtro invalido %j', (query) => {
        expect(() => filtrosReporte(query)).toThrow();
    });
    it('filtros ausentes/vacios y otros parametros mantienen contratos de Spring', () => {
        expect(filtrosReporte({})).toEqual({ companiaId: null, proyectoId: null });
        expect(filtrosReporte({ proyectoId: '', companiaId: '1', fechaDesde: 'ignorada' })).toEqual({ companiaId: 1, proyectoId: null });
    });
});
