import { vi } from 'vitest';
import { db } from '../prisma/db.js';
import { CONFIGURACION_INICIAL, ConfiguracionSistemaService } from './configuracion-sistema.service.js';

describe('Configuracion inicial bajo demanda', () => {
    let actual: Record<string, unknown> | null;
    const first = vi.fn(async () => actual);
    const create = vi.fn(async (data: Record<string, unknown>) => { actual = { id: 1, ...data }; return actual; });
    const execute = vi.fn(async () => undefined);
    const transaction = vi.fn();
    beforeEach(() => {
        actual = null;
        first.mockClear(); create.mockClear(); execute.mockClear(); transaction.mockReset();
        const table = { first, create };
        Object.assign(db.orm.public, { ConfiguracionSistema: table });
        let cola = Promise.resolve();
        transaction.mockImplementation(async (work) => {
            const previo = cola;
            let liberar!: () => void;
            cola = new Promise<void>((resolve) => { liberar = resolve; });
            await previo;
            try { return await work({ orm: { public: { ConfiguracionSistema: table } }, execute }); }
            finally { liberar(); }
        });
        Object.assign(db, { transaction, raw: { sql: (strings: TemplateStringsArray) => ({ affectedCount: () => ({ build: () => strings.join('') }) }) } });
    });
    it('no inicializa al construir el servicio', () => {
        new ConfiguracionSistemaService();
        expect(first).not.toHaveBeenCalled();
    });
    it('crea una unica fila con todos los valores de Spring Boot cuando falta', async () => {
        const service = new ConfiguracionSistemaService();
        const result = await service.obtenerOCrear();
        expect(result).toEqual({ id: 1, ...CONFIGURACION_INICIAL });
        const values = { ...CONFIGURACION_INICIAL };
        expect(values.varianteVisual).toBe('A');
        expect(Object.entries(values).filter(([key]) => key !== 'varianteVisual')).toHaveLength(20);
        expect(Object.entries(values).filter(([key]) => key !== 'varianteVisual').every(([, value]) => value === true)).toBe(true);
        expect(execute).toHaveBeenCalledWith('LOCK TABLE configuracion_sistema IN SHARE ROW EXCLUSIVE MODE');
        await service.obtenerOCrear();
        expect(create).toHaveBeenCalledOnce();
    });
    it('conserva configuracion existente desactivada sin escribir ni abrir transaccion', async () => {
        actual = { id: 7, ...CONFIGURACION_INICIAL, crearTicketActivo: false, crearTicketCliente: false, varianteVisual: 'B' };
        const result = await new ConfiguracionSistemaService().obtenerOCrear();
        expect(result).toBe(actual);
        expect(create).not.toHaveBeenCalled();
        expect(transaction).not.toHaveBeenCalled();
    });
    it('solicitudes simultaneas releen dentro del bloqueo y solo crean una fila', async () => {
        const results = await Promise.all(Array.from({ length: 5 }, () => new ConfiguracionSistemaService().obtenerOCrear()));
        expect(create).toHaveBeenCalledOnce();
        expect(results.every((r) => r.id === 1)).toBe(true);
        expect(transaction).toHaveBeenCalledTimes(5);
        expect(execute).toHaveBeenCalledTimes(5);
    });
});
