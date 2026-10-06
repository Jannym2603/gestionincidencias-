import type { Role } from './session';
export type Flags = Record<string, boolean>;
export const navigation = [
    { label: 'Dashboard', key: 'dashboard' }, { label: 'Tickets', key: 'tickets' }, { label: 'Proyectos', key: 'proyectos' },
    { label: 'Crear Ticket', key: 'crear-ticket', feature: 'crearTicket' },
    { label: 'Solicitudes de Recursos', key: 'solicitudes-recursos', feature: 'solicitudesRecursos' },
    { label: 'Usuarios', key: 'usuarios', admin: true }, { label: 'Reportes', key: 'reportes', feature: 'reportes' },
    { label: 'Historial', key: 'historial', feature: 'historial' }, { label: 'Gestión organizacional', key: 'companias-proyectos', admin: true },
    { label: 'Configuración', key: 'configuracion' },
];
export function featureAllowed(feature: string, role: Role, flags: Flags) {
    const global = { crearTicket: 'crearTicketActivo', solicitudesRecursos: 'solicitudesRecursosActivo', reportes: 'reportesActivos', historial: 'historialActivo' }[feature];
    const suffix = role.charAt(0) + role.slice(1).toLowerCase();
    return (flags[global ?? feature] ?? flags[feature] ?? true) && (role === 'ADMIN' || (flags[`${feature}${suffix}`] ?? true));
}
export function visible(key: string, role: Role, flags: Flags) {
    const item = navigation.find((n) => n.key === key);
    if (!item || (item.admin && !['ADMIN', 'SUPERVISOR'].includes(role))) return false;
    return !item.feature || featureAllowed(item.feature, role, flags);
}
