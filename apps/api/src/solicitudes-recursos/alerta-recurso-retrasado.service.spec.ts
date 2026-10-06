import { vi } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import { solicitudesFixture } from '../../test/solicitudes-recursos-fixture.js';
import { SolicitudesRecursosRepository } from './solicitudes-recursos.repository.js';
import { TicketsRepository } from '../tickets/tickets.repository.js';
import { NotificacionService } from '../notificaciones/notificacion.service.js';
import { AlertaRecursoRetrasadoService } from './alerta-recurso-retrasado.service.js';

describe('Alertas automaticas de recursos', () => {
    let f: ReturnType<typeof solicitudesFixture>;
    let service: AlertaRecursoRetrasadoService;
    beforeEach(() => {
        f = solicitudesFixture();
        f.solicitud.fechaEstimadaEntrega = Temporal.Now.plainDateTimeISO().subtract({ days: 1 });
        service = new AlertaRecursoRetrasadoService(f.repo as unknown as SolicitudesRecursosRepository,
            f.f.repo as unknown as TicketsRepository, f.notificaciones as unknown as NotificacionService);
    });
    afterEach(async () => { await service.onModuleDestroy(); vi.useRealTimers(); vi.unstubAllEnvs(); });
    it('marca solo envio exitoso una vez y conserva estado', async () => {
        await service.revisarSolicitudesRetrasadas();
        await service.revisarSolicitudesRetrasadas();
        expect(f.notificaciones.notificarRecursoRetrasado).toHaveBeenCalledOnce();
        expect(f.solicitud.fechaNotificacionRetraso).not.toBeNull();
        expect(f.solicitud.estadoRecurso).toBe('NUEVO');
        expect(f.f.repo.historial).not.toHaveBeenCalled();
    });
    it('fallo SMTP reintenta sin marcar', async () => {
        f.notificaciones.notificarRecursoRetrasado.mockResolvedValueOnce(false);
        await service.revisarSolicitudesRetrasadas();
        expect(f.solicitud.fechaNotificacionRetraso).toBeNull();
        await service.revisarSolicitudesRetrasadas();
        expect(f.notificaciones.notificarRecursoRetrasado).toHaveBeenCalledTimes(2);
    });
    it.each(['RECIBIDO', 'ENTREGADO', 'CERRADO', 'CANCELADO'])('%s excluido', async (estado) => {
        Object.assign(f.solicitud, { estadoRecurso: estado });
        await service.revisarSolicitudesRetrasadas();
        expect(f.notificaciones.notificarRecursoRetrasado).not.toHaveBeenCalled();
    });
    it('sin fecha o fecha futura no alerta; original vencida si alerta', async () => {
        f.solicitud.fechaEstimadaEntrega = null;
        await service.revisarSolicitudesRetrasadas();
        f.solicitud.fechaEstimadaEntrega = Temporal.Now.plainDateTimeISO().add({ days: 2 });
        await service.revisarSolicitudesRetrasadas();
        expect(f.notificaciones.notificarRecursoRetrasado).not.toHaveBeenCalled();
        f.solicitud.fechaEstimadaEntregaOriginal = Temporal.Now.plainDateTimeISO().subtract({ days: 1 });
        await service.revisarSolicitudesRetrasadas();
        expect(f.notificaciones.notificarRecursoRetrasado).toHaveBeenCalledOnce();
    });
    it('revalida tras bloqueo, no alerta recurso recibido concurrentemente', async () => {
        f.f.repo.findRecurso.mockImplementation(async () => ({ ...f.solicitud, estadoRecurso: 'RECIBIDO' }));
        await service.revisarSolicitudesRetrasadas();
        expect(f.notificaciones.notificarRecursoRetrasado).not.toHaveBeenCalled();
    });
    it('excepcion correo no rompe revision ni marca', async () => {
        f.notificaciones.notificarRecursoRetrasado.mockRejectedValueOnce(new Error('simulado'));
        await expect(service.revisarSolicitudesRetrasadas()).resolves.toBeUndefined();
        expect(f.solicitud.fechaNotificacionRetraso).toBeNull();
    });
    it('frecuencia Spring: inicial 60 segundos y fixedDelay una hora; cierre cancela timer', async () => {
        vi.useFakeTimers();
        f.solicitud.fechaEstimadaEntrega = null;
        service.onModuleInit();
        await vi.advanceTimersByTimeAsync(59999);
        expect(f.repo.findAll).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);
        expect(f.repo.findAll).toHaveBeenCalledOnce();
        await vi.advanceTimersByTimeAsync(3600000);
        expect(f.repo.findAll).toHaveBeenCalledTimes(2);
        await service.onModuleDestroy();
        await vi.advanceTimersByTimeAsync(3600000);
        expect(f.repo.findAll).toHaveBeenCalledTimes(2);
    });
    it('frecuencia configurable por variables equivalentes a propiedades Spring', async () => {
        vi.useFakeTimers();
        vi.stubEnv('APP_RECURSOS_RETRASOS_DELAY_INICIAL_MS', '100');
        vi.stubEnv('APP_RECURSOS_RETRASOS_INTERVALO_MS', '200');
        f.solicitud.fechaEstimadaEntrega = null;
        service.onModuleInit();
        await vi.advanceTimersByTimeAsync(300);
        expect(f.repo.findAll).toHaveBeenCalledTimes(2);
    });
});
