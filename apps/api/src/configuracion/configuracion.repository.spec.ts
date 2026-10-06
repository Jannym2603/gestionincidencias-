import { vi } from 'vitest';
import { ConfiguracionRepository } from './configuracion.repository.js';
import { CONFIGURACION_INICIAL } from './configuracion-sistema.service.js';
import { db } from '../prisma/db.js';

describe('ConfiguracionRepository', () => {
    it.each([null, { id: 7, ...CONFIGURACION_INICIAL }])('relee y crea solo si falta, dentro de tx.orm (%j)', async (actual) => {
        const table = { first: vi.fn(async () => actual), create: vi.fn(async () => ({ id: 7, ...CONFIGURACION_INICIAL })) };
        const execute = vi.fn();
        const transaction = vi.fn(async (work) => work({ orm: { public: { ConfiguracionSistema: table } }, execute }));
        const sql = (strings: TemplateStringsArray) => ({ affectedCount: () => ({ build: () => strings.join('') }) });
        Object.assign(db, { transaction, raw: { sql } });
        Object.assign(db.orm.public, { ConfiguracionSistema: { first: () => { throw new Error('No usar ORM fuera de tx'); } } });
        const result = await new ConfiguracionRepository().transaction((repo) => repo.obtenerOCrear());
        expect(result).toEqual({ id: 7, ...CONFIGURACION_INICIAL });
        expect(execute).toHaveBeenCalledWith('LOCK TABLE configuracion_sistema IN SHARE ROW EXCLUSIVE MODE');
        expect(table.create).toHaveBeenCalledTimes(actual === null ? 1 : 0);
        if (actual === null) expect(table.create).toHaveBeenCalledWith(CONFIGURACION_INICIAL);
    });
    it('auditoria ordenada por fechaCambio descendente', async () => {
        const all = vi.fn(async () => []);
        const orderBy = vi.fn((_selector: (fields: { fechaCambio: { desc: () => unknown } }) => unknown) => ({ all }));
        Object.assign(db.orm.public, { AuditoriaConfiguracion: { orderBy } });
        expect(await new ConfiguracionRepository().obtenerAuditoria()).toEqual([]);
        const fields = { fechaCambio: { desc: vi.fn() } };
        orderBy.mock.calls[0]![0](fields);
        expect(fields.fechaCambio.desc).toHaveBeenCalledOnce();
    });
});
