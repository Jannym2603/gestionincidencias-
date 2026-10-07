export function initializeSidebarToggle(app: HTMLElement) {
    const toggle = document.querySelector<HTMLButtonElement>('#sidebar-toggle');
    if (!toggle) return;
    const mobile = matchMedia('(max-width: 520px)');

    const applyDesktopState = () => app.classList.toggle('sidebar-colapsada', localStorage.getItem('sidebarColapsada') === 'true');
    if (!mobile.matches) applyDesktopState();

    const sync = () => {
        const collapsed = mobile.matches
            ? app.classList.contains('sidebar-movil-colapsada')
            : app.classList.contains('sidebar-colapsada');
        const action = mobile.matches
            ? (collapsed ? 'Abrir navegación' : 'Ocultar navegación')
            : (collapsed ? 'Expandir barra lateral' : 'Ocultar barra lateral');
        toggle.setAttribute('aria-expanded', String(!collapsed));
        toggle.setAttribute('aria-label', action);
        toggle.removeAttribute('title');
        toggle.removeAttribute('data-tooltip');
    };

    toggle.addEventListener('click', () => {
        if (mobile.matches) {
            app.classList.toggle('sidebar-movil-colapsada');
        } else {
            app.classList.toggle('sidebar-colapsada');
            localStorage.setItem('sidebarColapsada', String(app.classList.contains('sidebar-colapsada')));
        }
        sync();
    });

    mobile.addEventListener('change', ({ matches }) => {
        app.classList.remove('sidebar-movil-colapsada');
        if (!matches) applyDesktopState();
        sync();
    });
    sync();
}
