-- ============================================================
-- ACTUALIZACION DE BASE DE DATOS - SEPTIEMBRE 2026
-- Sistema de Gestion de Incidencias
--
-- Este script es idempotente en las columnas agregadas:
-- puede volver a ejecutarse sin duplicarlas.
-- ============================================================

-- Recuperacion de contrasena: almacenar hash BCrypt y limitar intentos.
ALTER TABLE codigos_recuperacion_password
ALTER COLUMN codigo TYPE VARCHAR(100);

ALTER TABLE codigos_recuperacion_password
ADD COLUMN IF NOT EXISTS intentos_fallidos INTEGER NOT NULL DEFAULT 0;

-- Seguimiento de recursos externos.
ALTER TABLE solicitudes_recurso
ADD COLUMN IF NOT EXISTS fecha_estimada_entrega_original TIMESTAMP;

ALTER TABLE solicitudes_recurso
ADD COLUMN IF NOT EXISTS motivo_retraso VARCHAR(100);

ALTER TABLE solicitudes_recurso
ADD COLUMN IF NOT EXISTS detalle_retraso TEXT;

-- Conservar como fecha original la primera fecha estimada existente.
UPDATE solicitudes_recurso
SET fecha_estimada_entrega_original = fecha_estimada_entrega
WHERE fecha_estimada_entrega_original IS NULL
  AND fecha_estimada_entrega IS NOT NULL;

-- Cierre real del ticket: el contador de tiempo abierto se detiene aqui.
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS fecha_cierre TIMESTAMP;

-- Verificacion rapida.
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'codigos_recuperacion_password'
  AND column_name IN ('codigo', 'intentos_fallidos')
ORDER BY column_name;

SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'solicitudes_recurso'
  AND column_name IN (
      'fecha_estimada_entrega_original',
      'motivo_retraso',
      'detalle_retraso'
  )
ORDER BY column_name;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tickets'
  AND column_name = 'fecha_cierre';
