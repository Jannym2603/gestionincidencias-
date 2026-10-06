import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import type { AuthRepository, AuthUsuario, CodigoRecuperacion, CodigoNuevo } from '../src/auth/auth.repository.js';

interface AuthFixture {
    usuario: AuthUsuario;
    usuarios: AuthUsuario[];
    codigos: CodigoRecuperacion[];
    repo: { [K in keyof AuthRepository]: Mock };
    notificaciones: { notificarCodigoRecuperacionPassword: Mock };
}
export function authFixture(hash: string): AuthFixture {
    const usuario = { id: 1, nombre: 'Usuario', apellido: 'Prueba', correo: 'usuario@example.test', password: hash,
        estado: true, telefono: null, fechaCreacion: null } as AuthUsuario;
    const usuarios = [usuario];
    const codigos: CodigoRecuperacion[] = [];
    let siguienteId = 1;
    let cola = Promise.resolve();
    const repo = {
        findUsuario: vi.fn(async (correo: string) => { const u = usuarios.find((u) => u.correo === correo); return u ? { ...u } : null; }),
        findRol: vi.fn(async () => ({ rol: { nombre: 'CLIENTE' } })),
        updatePassword: vi.fn(async (id: number, password: string) => Object.assign(usuarios.find((u) => u.id === id)!, { password })),
        findCodigo: vi.fn(async (correo: string) => {
            const c = codigos.filter((c) => c.correo === correo && !c.usado)
                .sort((a, b) => Temporal.PlainDateTime.compare(b.fechaCreacion, a.fechaCreacion))[0];
            return c ? { ...c } : null;
        }),
        createCodigo: vi.fn(async (data: CodigoNuevo) => { const c = { ...data, id: siguienteId++ }; codigos.push(c); return c; }),
        updateCodigo: vi.fn(async (id: number, data: Partial<CodigoRecuperacion>) => Object.assign(codigos.find((c) => c.id === id)!, data)),
        deleteCodigos: vi.fn(async (correo: string) => { for (let i = codigos.length - 1; i >= 0; i--) if (codigos[i]!.correo === correo) codigos.splice(i, 1); }),
        transaction: vi.fn(async (_correo: string, work: (r: AuthRepository) => Promise<unknown>) => {
            // Simula el bloqueo de fila real para verificar carreras, además del rollback.
            const previo = cola;
            let liberar!: () => void;
            cola = new Promise<void>((resolve) => { liberar = resolve; });
            await previo;
            const originales = usuarios.map((u) => ({ ...u }));
            const anteriores = codigos.map((c) => ({ ...c }));
            try { return await work(repo as unknown as AuthRepository); }
            catch (error) {
                originales.forEach((u, i) => Object.assign(usuarios[i]!, u));
                codigos.splice(0, codigos.length, ...anteriores);
                throw error;
            } finally { liberar(); }
        }),
    };
    return { usuario, usuarios, codigos, repo, notificaciones: { notificarCodigoRecuperacionPassword: vi.fn(async () => true) } };
}
