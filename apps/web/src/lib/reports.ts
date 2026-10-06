import { api, ApiError } from './http';
import { initializePage } from './page-layout';
interface Project { id: number; proyectoId?: number; nombre?: string; proyectoNombre?: string; companiaId: number; companiaNombre?: string; estado?: boolean }
interface Assignment { proyectoId: number; proyectoNombre: string; companiaId: number; companiaNombre: string; estado: boolean }
interface Count { nombre: string; total: number }
interface Summary { totalTickets: number; totalUsuarios: number; totalComentarios: number }
interface Operation { totalOperativos: number; ticketsNuevos: number; ticketsAsignados: number; ticketsEnProgreso: number; ticketsResueltos: number; ticketsCerrados: number }
interface Resources { totalSolicitudes: number; nuevas: number; enValidacion: number; solicitadasProveedor: number; esperandoProveedor: number; recibidas: number; entregadas: number; cerradas: number; canceladas: number; retrasadas: number; proximasEntregas: number; promedioDiasProveedor: number }
const $ = (id: string) => document.getElementById(id)!;
const projects: Array<{ id: number; name: string; companyId: number; companyName: string }> = [];
function row(root: HTMLElement, name: string, value: unknown) { const item = document.createElement('div'); item.className = 'report-item'; const label = document.createElement('span'); label.textContent = name; const total = document.createElement('strong'); total.textContent = String(value ?? 0); item.append(label, total); root.append(item); }
function countRows(id: string, values: Count[]) { const root = $(id); root.replaceChildren(); if (!values.length || values.every((item) => item.total === 0)) { root.textContent = 'Sin datos para este alcance.'; return; } for (const item of values) row(root, item.nombre, item.total); }
function text(id: string, value: unknown) { $(id).textContent = String(value ?? 0); }
function feedback(message: string, error = false) { const status = $('reports-data-status'); status.textContent = message; status.classList.toggle('error', error); }
function showAccessDenied(message: string) { $('reports-content').hidden = true; const denied = $('reports-access-denied'); if (denied) { denied.hidden = false; denied.textContent = message; } }
function query() { const params = new URLSearchParams(); const companyId = ($('reports-company') as HTMLSelectElement).value; const projectId = ($('reports-project') as HTMLSelectElement).value; params.set('companiaId', companyId); params.set('proyectoId', projectId); return `?${params}`; }
function renderSummary(op: Operation, resources: Resources) {
    const progress = op.ticketsAsignados + op.ticketsEnProgreso + op.ticketsResueltos;
    const body = $('report-summary-body'); body.replaceChildren();
    const values: Array<[string, string, unknown, string]> = [
        ['Operaciones', 'Tickets operativos', op.totalOperativos, 'Tickets que dependen del equipo de Operaciones.'],
        ['Operaciones', 'En progreso', progress, 'Incluye asignados, en progreso y estados históricos todavía no cerrados.'],
        ['Operaciones', 'Cerrados', op.ticketsCerrados, 'Tickets operativos finalizados.'],
        ['Recursos externos', 'Solicitudes', resources.totalSolicitudes, 'Solicitudes de piezas, equipos y otros recursos externos.'],
        ['Recursos externos', 'Esperando proveedor', resources.esperandoProveedor, 'Solicitudes cuyo avance depende de un proveedor.'],
        ['Recursos externos', 'Retrasadas', resources.retrasadas, 'Solicitudes que superaron la fecha estimada.'],
        ['Recursos externos', 'Promedio proveedor', `${Number(resources.promedioDiasProveedor || 0).toFixed(1)} días`, 'Tiempo promedio entre solicitud al proveedor y recepción.'],
    ];
    for (const valuesRow of values) { const tr = document.createElement('tr'); for (const value of valuesRow) { const td = document.createElement('td'); td.textContent = String(value); tr.append(td); } body.append(tr); }
}
async function load() {
    const suffix = query(); feedback('Cargando reportes…');
    try {
        const [summary, op, resources, states, priorities, types] = await Promise.all([
            api<Summary>(`reportes/resumen${suffix}`),
            api<Operation>(`reportes/operacion-resumen${suffix}`), api<Resources>(`reportes/recursos-resumen${suffix}`),
            api<Count[]>(`reportes/tickets-por-estado${suffix}`), api<Count[]>(`reportes/tickets-por-prioridad${suffix}`), api<Count[]>(`reportes/tickets-por-tipo${suffix}`),
        ]);
        text('report-total-tickets', summary.totalTickets); text('report-related-users', summary.totalUsuarios); text('report-comments', summary.totalComentarios);
        text('report-operational-total', op.totalOperativos); text('report-new', op.ticketsNuevos); text('report-progress', op.ticketsAsignados + op.ticketsEnProgreso + op.ticketsResueltos); text('report-closed', op.ticketsCerrados);
        text('resource-total', resources.totalSolicitudes); text('resource-waiting', resources.esperandoProveedor); text('resource-received', resources.recibidas); text('resource-delivered', resources.entregadas); text('resource-late', resources.retrasadas); text('resource-days', `${Number(resources.promedioDiasProveedor || 0).toFixed(1)} d`);
        countRows('report-states', states); countRows('report-priorities', priorities); countRows('report-types', types);
        countRows('resource-states', [['Nuevas', resources.nuevas], ['En validación', resources.enValidacion], ['Solicitadas al proveedor', resources.solicitadasProveedor], ['Esperando proveedor', resources.esperandoProveedor], ['Recibidas', resources.recibidas], ['Entregadas', resources.entregadas], ['Cerradas', resources.cerradas], ['Canceladas', resources.canceladas]].map(([nombre, total]) => ({ nombre: String(nombre), total: Number(total) })));
        countRows('resource-deliveries', [{ nombre: 'Retrasadas', total: resources.retrasadas }, { nombre: 'Próximas entregas (7 días)', total: resources.proximasEntregas }, { nombre: 'Promedio de proveedor (días)', total: Math.round(resources.promedioDiasProveedor * 10) / 10 }]);
        renderSummary(op, resources);
        const companyId = ($('reports-company') as HTMLSelectElement).value; const projectId = ($('reports-project') as HTMLSelectElement).value;
        const selectedProject = projects.find((item) => String(item.id) === projectId); const selectedCompany = projects.find((item) => String(item.companyId) === companyId);
        $('reports-scope').textContent = `Mostrando: ${selectedProject ? `${selectedProject.companyName} — ${selectedProject.name}` : selectedCompany?.companyName ?? 'Resumen general'}`;
        $('report-summary-title').textContent = selectedProject ? `Resumen de ${selectedProject.name}` : selectedCompany ? `Resumen de ${selectedCompany.companyName}` : 'Resumen del reporte';
        $('report-summary-description').textContent = selectedProject ? `Indicadores de ${selectedProject.companyName} / ${selectedProject.name}.` : selectedCompany ? `Indicadores consolidados de ${selectedCompany.companyName}.` : 'Comparación entre trabajo operativo y recursos externos.';
        feedback(summary.totalTickets || resources.totalSolicitudes ? 'Reporte actualizado.' : 'No hay datos para el alcance seleccionado.');
    } catch (error) {
        if (error instanceof ApiError && error.status === 403) { showAccessDenied(error.message); return; }
        feedback(error instanceof Error ? error.message : 'No se pudieron cargar los reportes.', true);
    }
}
function setProjects(selectCompany = true) {
    const company = ($('reports-company') as HTMLSelectElement).value; const select = $('reports-project') as HTMLSelectElement; const current = select.value;
    select.replaceChildren(new Option('Todos los proyectos', ''), ...projects.filter((project) => !company || String(project.companyId) === company).map((project) => new Option(project.name, String(project.id))));
    if ([...select.options].some((option) => option.value === current)) select.value = current;
    if (selectCompany) void load();
}
async function initialize() {
    const initialized = await initializePage(); if (!initialized) return;
    $('reports-content').hidden = false;
    $('reports-reload').addEventListener('click', () => void load()); $('reports-print').addEventListener('click', () => window.print());
    $('reports-clear').addEventListener('click', () => { ($('reports-company') as HTMLSelectElement).value = ''; ($('reports-project') as HTMLSelectElement).value = ''; setProjects(false); void load(); });
    $('reports-company').addEventListener('change', () => { ($('reports-project') as HTMLSelectElement).value = ''; setProjects(); }); $('reports-project').addEventListener('change', () => void load());
    try {
        if (initialized.session.rol === 'ADMIN') {
            const rows = await api<Project[]>('proyectos');
            projects.push(...rows.filter((item) => item.estado !== false).map((item) => ({ id: item.id ?? item.proyectoId!, name: item.nombre ?? item.proyectoNombre ?? 'Proyecto', companyId: item.companiaId, companyName: item.companiaNombre ?? 'Compañía' })));
        } else {
            const rows = await api<Assignment[]>('usuario-proyectos/mis-proyectos');
            projects.push(...rows.filter((item) => item.estado).map((item) => ({ id: item.proyectoId, name: item.proyectoNombre, companyId: item.companiaId, companyName: item.companiaNombre })));
        }
        const companies = [...new Map(projects.map((item) => [item.companyId, item.companyName])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'));
        ($('reports-company') as HTMLSelectElement).replaceChildren(new Option('Todas las compañías', ''), ...companies.map(([id, name]) => new Option(name, String(id)))); setProjects(false); $('reports-status').textContent = ''; await load();
    } catch (error) { if (error instanceof ApiError && error.status === 403) { showAccessDenied(error.message); return; } feedback(error instanceof Error ? error.message : 'No se pudo cargar el alcance de reportes.', true); }
}
void initialize();
