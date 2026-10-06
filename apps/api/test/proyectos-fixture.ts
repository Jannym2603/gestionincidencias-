import { vi } from 'vitest';

// Executes the actual where predicates against synthetic records, without PostgreSQL.
export function coleccion(rows: Record<string, unknown>[]) {
  return {
    where(predicate: (fields: Record<string, { eq(value: unknown): boolean; in(values: unknown[]): boolean }>) => boolean) {
      return coleccion(rows.filter((row) => predicate(new Proxy({}, {
        get: (_, key: string) => ({
          eq: (value: unknown) => row[key] === value,
          in: (values: unknown[]) => values.includes(row[key]),
        }),
      }))));
    },
    include() { return this; },
    select() { return this; },
    all: vi.fn(async () => rows),
    first: vi.fn(async () => rows[0] ?? null),
  };
}

export function proyectosFixture() {
  const proyectos = [
    { id: 1, nombre: 'Asignado', estado: true, companiaId: 1 },
    { id: 2, nombre: 'Otro usuario', estado: true, companiaId: 1 },
    { id: 3, nombre: 'Asignacion inactiva', estado: true, companiaId: 1 },
    { id: 4, nombre: 'Proyecto inactivo', estado: false, companiaId: 1 },
    { id: 5, nombre: 'Compania inactiva', estado: true, companiaId: 2 },
  ];
  for (const proyecto of proyectos) Object.assign(proyecto, { companiaNombre: null });
  const asignaciones = proyectos.map((proyecto) => ({
    usuarioId: proyecto.id === 2 ? 20 : 10,
    proyectoId: proyecto.id,
    estado: proyecto.id !== 3,
    proyecto: { ...proyecto, compania: { estado: proyecto.companiaId === 1 } },
  }));
  return {
    proyectos,
    Proyectos: coleccion(proyectos),
    UsuarioProyectos: coleccion(asignaciones),
  };
}
