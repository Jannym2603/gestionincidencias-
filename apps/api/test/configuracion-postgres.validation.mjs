// Manual, strictly read-only check of the configured PostgreSQL database.
// Missing configuration is NOT initialized here: unit tests cover that branch.
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { db } from '../dist/prisma/db.js';
import { ConfiguracionSistemaService } from '../dist/configuracion/configuracion-sistema.service.js';

const originalOrm = db.orm;
const rollback = new Error('READ_ONLY_VALIDATION_ROLLBACK');
let verificado = false;
try {
    try {
        await db.transaction(async (tx) => {
            await tx.execute(db.raw.sql`SET TRANSACTION READ ONLY`.affectedCount().build());
            await tx.execute(db.raw.sql`SET LOCAL statement_timeout = '10s'`.affectedCount().build());
            db.orm = tx.orm;
            const antes = await tx.orm.public.ConfiguracionSistema.all();
            assert.ok(antes.length, 'La comprobacion de solo lectura requiere configuracion existente');
            const service = new ConfiguracionSistemaService();
            const primera = await service.obtenerOCrear();
            const segunda = await service.obtenerOCrear();
            assert.deepEqual(primera, segunda);
            assert.ok(antes.some((fila) => JSON.stringify(fila) === JSON.stringify(primera)));
            assert.deepEqual(await tx.orm.public.ConfiguracionSistema.all(), antes);
            verificado = true;
            throw rollback;
        });
    } catch (error) { if (error !== rollback) throw error; }
    assert.ok(verificado);
    console.log(JSON.stringify({ resultado: 'OK', configuracionExistente: 'conservada',
        consultasRepetidas: 'idempotentes', transaccion: 'READ ONLY y rollback', escrituras: 0 }));
} catch (error) {
    // Connection errors can contain secrets; do not print message or stack.
    console.error(JSON.stringify({ resultado: 'ERROR', tipo: error?.name }));
    process.exitCode = 1;
} finally {
    db.orm = originalOrm;
    await db.close();
}
