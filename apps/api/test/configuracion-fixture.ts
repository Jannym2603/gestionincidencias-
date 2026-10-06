import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import { CONFIGURACION_INICIAL } from '../src/configuracion/configuracion-sistema.service.js';
import type { ConfiguracionSistema } from '../src/configuracion/configuracion-sistema.service.js';
import type { ConfiguracionRepository, AuditoriaConfiguracion, AuditoriaNueva } from '../src/configuracion/configuracion.repository.js';
import type { ConfiguracionDTO } from '../src/configuracion/configuracion.rules.js';

interface ConfiguracionFixture {
    estado: { configuracion: ConfiguracionSistema | null; creaciones: number };
    auditoria: AuditoriaConfiguracion[];
    repo: { [K in keyof ConfiguracionRepository]: Mock };
    inicial: { obtenerOCrear: Mock };
}
export function configuracionFixture(): ConfiguracionFixture {
    const estado: ConfiguracionFixture['estado'] = { configuracion: { id: 7, ...CONFIGURACION_INICIAL }, creaciones: 0 };
    const auditoria: AuditoriaConfiguracion[] = [];
    let cola = Promise.resolve();
    const repo = {
        transaction: vi.fn(async (work: (repo: ConfiguracionRepository) => Promise<unknown>) => {
            const anterior = cola;
            let liberar!: () => void;
            cola = new Promise<void>((resolve) => { liberar = resolve; });
            await anterior;
            const copia = estado.configuracion ? { ...estado.configuracion } : null;
            const cantidad = auditoria.length;
            const creaciones = estado.creaciones;
            try { return await work(repo as unknown as ConfiguracionRepository); }
            catch (error) { estado.configuracion = copia; auditoria.length = cantidad; estado.creaciones = creaciones; throw error; }
            finally { liberar(); }
        }),
        obtenerOCrear: vi.fn(async () => {
            if (!estado.configuracion) { estado.configuracion = { id: 7, ...CONFIGURACION_INICIAL }; estado.creaciones++; }
            return estado.configuracion;
        }),
        update: vi.fn(async (_id: number, data: ConfiguracionDTO) => { Object.assign(estado.configuracion!, data); }),
        usuario: vi.fn(async (correo: string) => correo === 'admin@example.test' ? { nombre: 'Admin', apellido: 'Prueba' } : null),
        auditoria: vi.fn(async (data: AuditoriaNueva) => { const row = { ...data, id: auditoria.length + 1 }; auditoria.push(row); return row; }),
        obtenerAuditoria: vi.fn(async () => [...auditoria].sort((a, b) => Temporal.PlainDateTime.compare(b.fechaCambio, a.fechaCambio))),
    };
    const inicial = { obtenerOCrear: vi.fn(async () => estado.configuracion ?? repo.transaction(async () => repo.obtenerOCrear())) };
    return { estado, auditoria, repo, inicial };
}
