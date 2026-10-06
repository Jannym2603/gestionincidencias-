import { ApiError } from './http';
import { initializePage } from './page-layout';
import type { Role, Session } from './session';

export interface AdminContext { session: Session }
export type ApiRow = Record<string, unknown>;

export async function startAdminPage(allowed: readonly Role[] = ['ADMIN', 'SUPERVISOR']): Promise<AdminContext | null> {
    const initialized = await initializePage();
    if (!initialized) return null;
    const content = document.getElementById('admin-content');
    const denied = document.getElementById('admin-access-denied');
    if (!allowed.includes(initialized.session.rol)) {
        if (content) content.hidden = true;
        if (denied) { denied.hidden = false; denied.textContent = 'No tienes permiso para acceder a esta sección.'; }
        return null;
    }
    if (denied) denied.hidden = true;
    if (content) content.hidden = false;
    return { session: initialized.session };
}

export function reportError(error: unknown, statusId: string) {
    if (error instanceof ApiError && error.status === 401) return;
    if (error instanceof ApiError && error.status === 403) {
        const content = document.getElementById('admin-content');
        const denied = document.getElementById('admin-access-denied');
        if (content) content.hidden = true;
        if (denied) { denied.hidden = false; denied.textContent = error.message || 'No tienes permiso para acceder a esta sección.'; }
        return;
    }
    const status = document.getElementById(statusId);
    if (status) { status.textContent = error instanceof Error ? error.message : 'No se pudo completar la operación.'; status.classList.add('error'); }
}

export function setStatus(id: string, message: string, error = false) {
    const status = document.getElementById(id);
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('error', error);
    status.classList.toggle('success', !error && Boolean(message));
}

export function node<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
    const result = document.createElement(tag);
    result.textContent = text;
    if (className) result.className = className;
    return result;
}

export function cell(row: HTMLTableRowElement, text: unknown, className = '') {
    const item = node('td', text == null || text === '' ? '—' : String(text), className);
    row.append(item);
    return item;
}

export function badge(text: string, active: boolean) {
    return node('span', text, `badge ${active ? 'badge-resuelto' : 'badge-cerrado'}`);
}

export function setBusy(button: HTMLButtonElement, busy: boolean, idleLabel: string) {
    button.disabled = busy;
    button.textContent = busy ? 'Guardando…' : idleLabel;
}

export function formatDate(value: unknown) {
    if (!value) return '—';
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-PA');
}

export function confirmed(message: string) { return window.confirm(message); }

export function showNoRows(tbody: HTMLTableSectionElement, colspan: number, message: string) {
    tbody.replaceChildren();
    const row = node('tr');
    const item = node('td', message);
    item.colSpan = colspan;
    row.append(item);
    tbody.append(row);
}

export function canManageTarget(actor: Role, targetRole: unknown) {
    const role = String(targetRole ?? '').toUpperCase();
    return actor === 'ADMIN' || (actor === 'SUPERVISOR' && ['CLIENTE', 'AGENTE'].includes(role));
}

export function fillOptions(select: HTMLSelectElement, options: Array<{ value: string; label: string }>, placeholder: string, keepValue = false) {
    const previous = keepValue ? select.value : '';
    select.replaceChildren(new Option(placeholder, ''), ...options.map((item) => new Option(item.label, item.value)));
    if (previous && options.some((item) => item.value === previous)) select.value = previous;
}
