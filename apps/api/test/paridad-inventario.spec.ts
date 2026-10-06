import { auditarParidad } from './paridad-inventario.js';
describe('Inventario completo de Spring y frontend legacy', () => {
    const auditoria = auditarParidad();
    it('todos los 64 endpoints Spring tienen método/ruta equivalente', () => { expect(auditoria.spring).toHaveLength(64); expect(auditoria.faltantes).toEqual([]); });
    it('todas las URLs /api de HTML/JS existen en Nest', () => { expect(auditoria.frontend).toHaveLength(53); expect(auditoria.legacyFaltantes).toEqual([]); });
    it('ninguna combinación método/ruta Nest está duplicada', () => { expect(auditoria.duplicados).toEqual([]); });
    it('solo hay tres endpoints adicionales intencionales', () => { expect(auditoria.adicionales.map((r) => `${r.metodo} ${r.ruta}`).sort()).toEqual(['GET /', 'GET /api/reportes/operacion-resumen', 'GET /api/reportes/recursos-resumen']); });
});
