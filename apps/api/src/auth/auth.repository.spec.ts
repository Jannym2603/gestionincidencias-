import { vi } from 'vitest';
import { AuthRepository } from './auth.repository.js';
import { db } from '../prisma/db.js';

describe('AuthRepository: aislamiento y persistencia de intentos', () => {
    it('busca correo por igualdad exacta, no ILIKE con comodines', async () => {
        const table = { where: vi.fn(), first: vi.fn(async () => null) };
        table.where.mockReturnValue(table);
        Object.assign(db.orm.public, { Usuarios: table });
        await new AuthRepository().findUsuario('user_1@example.test');
        const fields = { correo: { eq: vi.fn() } };
        table.where.mock.calls[0]![0](fields);
        expect(fields.correo.eq).toHaveBeenCalledWith('user_1@example.test');
    });
    it('usa tx.orm, bloqueo de usuario y eliminacion parametrizada exclusiva de ese correo', async () => {
        const sql = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
            const build = () => ({ text: strings.join('?'), values });
            return { affectedCount: () => ({ build }), returnsRow: () => ({ build }) };
        });
        const table = { where: vi.fn(), first: vi.fn(async () => ({ id: 7 })) };
        table.where.mockReturnValue(table);
        const tx = { orm: { public: { Usuarios: table } }, execute: vi.fn(), query: vi.fn() };
        const transaction = vi.fn(async (work: (value: typeof tx) => Promise<unknown>) => work(tx));
        Object.assign(db, { transaction, raw: { sql } });
        Object.assign(db.orm.public, { Usuarios: { where: () => { throw new Error('No usar ORM exterior'); } } });
        const result = await new AuthRepository().transaction('user@example.test', async (repo) => {
            expect(await repo.findUsuario('user@example.test')).toEqual({ id: 7 });
            await repo.deleteCodigos('user@example.test');
            return 'error de negocio tras persistir';
        });
        expect(result).toBe('error de negocio tras persistir');
        expect(tx.query).toHaveBeenCalledWith({ text: 'SELECT id FROM usuarios WHERE correo = ? FOR UPDATE', values: ['user@example.test'] });
        expect(tx.execute).toHaveBeenCalledWith({ text: 'DELETE FROM codigos_recuperacion_password WHERE correo = ?', values: ['user@example.test'] });
    });
    it('impide eliminar codigos fuera de transaccion', () => {
        expect(() => new AuthRepository().deleteCodigos('user@example.test')).toThrow('transacción');
    });
});
