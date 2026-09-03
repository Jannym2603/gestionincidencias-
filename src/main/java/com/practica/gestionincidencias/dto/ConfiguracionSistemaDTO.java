package com.practica.gestionincidencias.dto;

public record ConfiguracionSistemaDTO(

        // =========================
        // ESTADO GLOBAL DE MÓDULOS
        // =========================

        Boolean crearTicketActivo,

        Boolean solicitudesRecursosActivo,

        Boolean reportesActivos,

        Boolean historialActivo,


        // =========================
        // CREAR TICKET POR ROL
        // =========================

        Boolean crearTicketCliente,

        Boolean crearTicketAgente,

        Boolean crearTicketSupervisor,

        Boolean crearTicketAdmin,


        // =========================
        // SOLICITUDES DE RECURSOS
        // POR ROL
        // =========================

        Boolean solicitudesRecursosCliente,

        Boolean solicitudesRecursosAgente,

        Boolean solicitudesRecursosSupervisor,

        Boolean solicitudesRecursosAdmin,


        // =========================
        // REPORTES POR ROL
        // =========================

        Boolean reportesCliente,

        Boolean reportesAgente,

        Boolean reportesSupervisor,

        Boolean reportesAdmin,


        // =========================
        // HISTORIAL POR ROL
        // =========================

        Boolean historialCliente,

        Boolean historialAgente,

        Boolean historialSupervisor,

        Boolean historialAdmin,


        /*
         * Se mantiene temporalmente para compatibilidad
         * con la configuración existente.
         */
        String varianteVisual

) {
}
