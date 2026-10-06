import { vi } from 'vitest';
import { ReportesRepository } from './reportes.repository.js';
import { TicketsRepository } from '../tickets/tickets.repository.js';
import { db } from '../prisma/db.js';

describe('ReportesRepository: consultas de solo lectura', () => {
    it('reutiliza filtro de Tickets sin invocar servicio ni writes de SLA', async () => {
        const findAll = vi.fn(async () => []);
        const repo = new ReportesRepository({ findAll } as unknown as TicketsRepository);
        await repo.findTickets([1, 2], 10, 'CLIENTE');
        expect(findAll).toHaveBeenCalledWith([1, 2], 10, 'CLIENTE');
    });
    it('conteo de usuarios selecciona solo ids e incluye inactivos', async () => {
        const select = vi.fn(() => ({ all: async () => [{ id: 1 }, { id: 2 }] }));
        Object.assign(db.orm.public, { Usuarios: { select } });
        expect(await new ReportesRepository({} as TicketsRepository).totalUsuarios()).toBe(2);
        expect(select).toHaveBeenCalledWith('id');
    });
    it('comentarios filtra ticketIds en base y selecciona solo campos de conteo', async () => {
        const table = { where: vi.fn(), select: vi.fn(), all: vi.fn(async () => []) };
        table.where.mockReturnValue(table);
        table.select.mockReturnValue(table);
        Object.assign(db.orm.public, { Comentarios: table });
        await new ReportesRepository({} as TicketsRepository).comentarios([7, 9]);
        const fields = { ticketId: { in: vi.fn() } };
        table.where.mock.calls[0]![0](fields);
        expect(fields.ticketId.in).toHaveBeenCalledWith([7, 9]);
        expect(table.select).toHaveBeenCalledWith('ticketId', 'tipoComentario');
    });
    it('sin tickets no consulta tablas de comentarios/recursos', async () => {
        const table = { where: vi.fn(() => { throw new Error('No consultar sin ids'); }) };
        Object.assign(db.orm.public, { Comentarios: table, SolicitudesRecurso: table });
        const repo = new ReportesRepository({} as TicketsRepository);
        expect(await repo.comentarios([])).toEqual([]);
        expect(await repo.recursos([])).toEqual([]);
        expect(table.where).not.toHaveBeenCalled();
    });
});
