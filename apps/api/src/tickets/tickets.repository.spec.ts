import { vi } from 'vitest';
import { TicketsRepository } from './tickets.repository.js';
import { db } from '../prisma/db.js';

describe('TicketsRepository', () => {
    it('replica cantidad anual + 1 de Spring Boot incluso con huecos', async () => {
        const query = { where: vi.fn(), select: vi.fn(), all: vi.fn(async () => [
            { numeroTicket: 'INC-2026-0001' }, { numeroTicket: 'INC-2026-0003' },
        ]) };
        query.where.mockReturnValue(query);
        query.select.mockReturnValue(query);
        Object.assign(db.orm.public, { Tickets: query });
        expect(await new TicketsRepository().numeroTicket(2026)).toBe('INC-2026-0003');
        const fields = { numeroTicket: { like: vi.fn() } };
        query.where.mock.calls[0]![0](fields);
        expect(fields.numeroTicket.like).toHaveBeenCalledWith('INC-2026-%');
    });

    it.each([0, 9, 9999])('formatea cantidad anual %s como Spring Boot', async (cantidad) => {
        const query = { where: vi.fn(), select: vi.fn(), all: vi.fn(async () => Array.from({ length: cantidad }, () => ({}))) };
        query.where.mockReturnValue(query);
        query.select.mockReturnValue(query);
        Object.assign(db.orm.public, { Tickets: query });
        expect(await new TicketsRepository().numeroTicket(2026)).toBe(`INC-2026-${String(cantidad + 1).padStart(4, '0')}`);
    });

    it.each([null, 42])('usa transaccion y bloqueo para %s', async (id) => {
        const sql = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
            const build = () => ({ text: strings.join('?'), values });
            return { affectedCount: () => ({ build }), returnsRow: () => ({ build }) };
        });
        const tx = { orm: { public: {} }, execute: vi.fn(), query: vi.fn() };
        const transaction = vi.fn(async (work: (value: typeof tx) => Promise<unknown>) => work(tx));
        Object.assign(db, { raw: { sql }, transaction });
        const result = await new TicketsRepository().transaction(id, async (repo) => {
            expect(repo).toBeInstanceOf(TicketsRepository);
            return 'guardado';
        });
        expect(result).toBe('guardado');
        expect(transaction).toHaveBeenCalledOnce();
        if (id === null) {
            expect(tx.execute).toHaveBeenCalledWith(expect.objectContaining({ text: 'LOCK TABLE tickets IN SHARE ROW EXCLUSIVE MODE' }));
            expect(tx.query).not.toHaveBeenCalled();
        } else {
            expect(tx.query).toHaveBeenCalledWith({ text: 'SELECT id FROM tickets WHERE id = ? FOR UPDATE', values: [42] });
            expect(tx.execute).not.toHaveBeenCalled();
        }
    });
});
