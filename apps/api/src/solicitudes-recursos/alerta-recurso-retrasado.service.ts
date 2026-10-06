import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Temporal } from 'temporal-polyfill';
import { TicketsRepository } from '../tickets/tickets.repository.js';
import { NotificacionService } from '../notificaciones/notificacion.service.js';
import { SolicitudesRecursosRepository } from './solicitudes-recursos.repository.js';
import { seguimiento } from './solicitudes-recursos.rules.js';

function demora(nombre: string, defecto: number) {
    const valor = Number(process.env[nombre] ?? defecto);
    return Number.isSafeInteger(valor) && valor > 0 && valor <= 2147483647 ? valor : defecto;
}

@Injectable()
export class AlertaRecursoRetrasadoService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(AlertaRecursoRetrasadoService.name);
    private timer?: ReturnType<typeof setTimeout>;
    private detenido = false;
    private ejecutando?: Promise<void>;
    constructor(private readonly solicitudes: SolicitudesRecursosRepository, private readonly tickets: TicketsRepository,
        private readonly notificaciones: NotificacionService) {}
    onModuleInit() { this.programar(demora('APP_RECURSOS_RETRASOS_DELAY_INICIAL_MS', 60000)); }
    private programar(ms: number) {
        this.timer = setTimeout(async () => {
            this.ejecutando = this.revisarSolicitudesRetrasadas();
            try { await this.ejecutando; }
            catch { this.logger.warn('No se pudo completar la revisión de recursos retrasados.'); }
            finally {
                this.ejecutando = undefined;
                if (!this.detenido) this.programar(demora('APP_RECURSOS_RETRASOS_INTERVALO_MS', 3600000));
            }
        }, ms);
        this.timer.unref();
    }
    async onModuleDestroy() {
        this.detenido = true;
        clearTimeout(this.timer);
        await this.ejecutando?.catch(() => undefined);
    }
    async revisarSolicitudesRetrasadas() {
        const ahora = Temporal.Now.plainDateTimeISO();
        const rows = await this.solicitudes.findAll();
        for (const s of rows) {
            // Replica la consulta JPQL: estado no nulo, comparación exacta y fecha original preferida.
            if (!s.estadoRecurso || ['RECIBIDO', 'ENTREGADO', 'CERRADO', 'CANCELADO'].includes(s.estadoRecurso)
                || s.fechaNotificacionRetraso || !seguimiento(s, ahora).retrasada) continue;
            try {
                await this.tickets.transaction(s.ticketId, async (repo) => {
                    const actual = await repo.findRecurso(s.id);
                    if (!actual || actual.fechaNotificacionRetraso || !seguimiento(actual).retrasada) return;
                    const ticket = await repo.findOne(actual.ticketId);
                    if (!ticket) return;
                    if (await this.notificaciones.notificarRecursoRetrasado({ ...actual, ticket })) {
                        await repo.updateRecurso(actual.id, { fechaNotificacionRetraso: Temporal.Now.plainDateTimeISO() });
                    }
                });
            } catch { this.logger.warn('No se pudo notificar el retraso del recurso.'); }
        }
    }
}
