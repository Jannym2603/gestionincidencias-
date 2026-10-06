import { CONFIGURACION_INICIAL } from './configuracion-sistema.service.js';
import { actualizarConfiguracionDTO, configuracionDTO, FLAGS_CONFIGURACION, resolverConfiguracion } from './configuracion.rules.js';

describe('Configuracion: contratos y defaults Spring', () => {
    it('veinte flags true, DTO sin id ni variante', () => {
        const dto = configuracionDTO(CONFIGURACION_INICIAL);
        expect(Object.keys(dto)).toHaveLength(20);
        expect(Object.values(dto).every((v) => v === true)).toBe(true);
        expect(dto).not.toHaveProperty('varianteVisual');
    });
    it('lectura legacy null usa true sin sobrescribir registro', () => {
        const actual = { crearTicketActivo: null, reportesCliente: false };
        expect(configuracionDTO(actual)).toMatchObject({ crearTicketActivo: true, reportesCliente: false });
        expect(actual.crearTicketActivo).toBeNull();
    });
    it('permiso null conserva false, actual null usa true', () => {
        const actual = { id: 1, ...CONFIGURACION_INICIAL, reportesCliente: false, historialAdmin: null };
        const dto = resolverConfiguracion(actual as unknown as Parameters<typeof resolverConfiguracion>[0], { reportesCliente: null, historialAdmin: null });
        expect(dto).toMatchObject({ reportesCliente: false, historialAdmin: true });
    });
    it.each(FLAGS_CONFIGURACION.map(([campo]) => campo))('%s acepta booleano y rechaza cadena', (campo) => {
        const globales = { crearTicketActivo: true, solicitudesRecursosActivo: true, reportesActivos: true, historialActivo: true };
        expect(actualizarConfiguracionDTO({ ...globales, [campo]: false })[campo]).toBe(false);
        expect(() => actualizarConfiguracionDTO({ ...globales, [campo]: 'false' })).toThrow('booleano');
    });
    it('ignora campos fuera de allowlist como DTO Jackson', () => {
        const dto = actualizarConfiguracionDTO({ ...configuracionDTO(CONFIGURACION_INICIAL), varianteVisual: 'B', id: 9, password: 'simulado' });
        expect(Object.keys(dto)).toHaveLength(20);
        expect(dto).not.toHaveProperty('password');
    });
});
