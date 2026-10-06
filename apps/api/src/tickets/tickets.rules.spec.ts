import { Temporal } from 'temporal-polyfill';
import { fechasSla, prioridad, ticketDTO, validarTransicion } from './tickets.rules.js';
import { ticketsFixture } from '../../test/tickets-fixture.js';

describe('Reglas Tickets', () => {
    it.each([['ALTO', 'ALTA', 'P1_CRITICA'], ['ALTO', 'MEDIA', 'P2_ALTA'], ['MEDIO', 'ALTA', 'P2_ALTA'],
        ['MEDIO', 'MEDIA', 'P3_MEDIA'], ['BAJO', 'BAJA', 'P4_BAJA']])('matriz %s/%s', (i, u, p) => {
        expect(prioridad(i!, u!)).toBe(p);
    });
    it.each([['P1_CRITICA', 30, 4], ['P2_ALTA', 60, 8], ['P3_MEDIA', 240, 24], ['P4_BAJA', 480, 72]] as const)
        ('SLA %s', (p, minutos, horas) => {
            const inicio = Temporal.PlainDateTime.from('2026-10-06T10:00');
            const fechas = fechasSla(p, inicio, false);
            expect(inicio.until(fechas.fechaLimiteRespuesta).total('minutes')).toBe(minutos);
            expect(inicio.until(fechas.fechaLimiteResolucion!).total('hours')).toBe(horas);
            expect(fechasSla(p, inicio, true).fechaLimiteResolucion).toBeNull();
        });
    it('75% en riesgo; limite exacto en riesgo; despues vencido', () => {
        const { ticket } = ticketsFixture();
        const inicio = ticket.fechaCreacion!;
        expect(ticketDTO(ticket, inicio.add({ hours: 3 })).estadoSlaRespuesta).toBe('EN_RIESGO');
        expect(ticketDTO(ticket, inicio.add({ hours: 4 })).estadoSlaRespuesta).toBe('EN_RIESGO');
        expect(ticketDTO(ticket, inicio.add({ hours: 4, seconds: 1 })).estadoSlaRespuesta).toBe('VENCIDO');
    });
    it('respuesta terminada determina cumplimiento', () => {
        const { ticket } = ticketsFixture();
        ticket.fechaPrimeraRespuesta = ticket.fechaLimiteRespuesta;
        expect(ticketDTO(ticket).estadoSlaRespuesta).toBe('CUMPLIDO');
        ticket.fechaPrimeraRespuesta = ticket.fechaLimiteRespuesta!.add({ seconds: 1 });
        expect(ticketDTO(ticket).estadoSlaRespuesta).toBe('INCUMPLIDO');
    });
    it('compatibilidad ASIGNADO -> EN_PROGRESO requiere agente', () => {
        const { ticket } = ticketsFixture();
        ticket.estado = 'ASIGNADO' as typeof ticket.estado;
        expect(() => validarTransicion(ticket, 'EN_PROGRESO', null)).toThrow();
        ticket.agenteAsignadoId = 20;
        expect(() => validarTransicion(ticket, 'EN_PROGRESO', null)).not.toThrow();
    });
});
