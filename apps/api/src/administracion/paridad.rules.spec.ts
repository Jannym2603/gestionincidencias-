import { Temporal } from 'temporal-polyfill';
import { crearTicketDTO } from '../tickets/tickets.dto.js';
import { ticketDTO, validarTransicion } from '../tickets/tickets.rules.js';
import type { TicketCompleto } from '../tickets/tickets.repository.js';
import { estadoDTO } from './administracion.service.js';
import { carpetasAdjuntos } from '../adjuntos/almacenamiento.js';
import { resolve } from 'node:path';
describe('Regresiones de la auditoría final', () => {
    const datos = { titulo: 'Ticket', descripcion: 'Descripción', tipoIncidenciaId: 1, proyectoId: 1, clienteId: 10, impacto: 'MEDIO', urgencia: 'MEDIA' };
    it.each([undefined, null, '', ' ', 'operativo', ' OPERATIVO '])('tipoAtencion %j usa OPERATIVO', (tipoAtencion) => { expect(crearTicketDTO({ ...datos, tipoAtencion }).tipoAtencion).toBe('OPERATIVO'); });
    it('tipo externo se normaliza y requiere solicitud válida', () => {
        expect(crearTicketDTO({ ...datos, tipoAtencion: 'recurso_externo', solicitudRecurso: { categoria: 'equipo', recurso: 'Teclado', cantidad: 1 } })).toMatchObject({ tipoAtencion: 'RECURSO_EXTERNO', solicitudRecurso: { categoria: 'EQUIPO' } });
        expect(() => crearTicketDTO({ ...datos, tipoAtencion: 'recurso_externo' })).toThrow();
    });
    it('operativo ignora solicitudRecurso como Spring', () => { expect(crearTicketDTO({ ...datos, solicitudRecurso: { invalido: true } }).solicitudRecurso).toBeNull(); });
    it('ticket histórico externo en minúsculas no entra al flujo operativo', () => { expect(() => validarTransicion({ tipoAtencion: 'recurso_externo', estado: 'EN_PROGRESO' } as TicketCompleto, 'CERRADO', 'Nota')).toThrow(); });
    it('SLA histórico externo sin plazo de resolución', () => {
        const t = { tipoAtencion: 'recurso_externo', prioridad: 'P3_MEDIA', fechaCreacion: Temporal.PlainDateTime.from('2026-01-01T00:00'), fechaLimiteRespuesta: null, fechaLimiteResolucion: null, cliente: null, proyecto: null, agenteAsignado: null } as unknown as TicketCompleto;
        expect(ticketDTO(t)).toMatchObject({ estadoSlaResolucion: 'NO_APLICA', fechaLimiteResolucion: null, slaResolucionCumplido: null });
    });
    it.each([null, undefined, 'true', {}, 1])('estado directo inválido %j', (v) => { expect(() => estadoDTO(v)).toThrow(); });
    it.each([true, false])('estado directo %j válido', (v) => { expect(estadoDTO(v)).toBe(v); });
    it('almacenamiento tiene carpeta Spring y anterior Nest deterministas', () => {
        const c = carpetasAdjuntos(); expect(c.principal).toBe(resolve('..', '..', 'uploads', 'adjuntos'));
        expect(c.anteriores).toEqual([resolve('uploads', 'adjuntos')]);
    });
});
