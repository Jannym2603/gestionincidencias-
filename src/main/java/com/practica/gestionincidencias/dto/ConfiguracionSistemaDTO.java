package com.practica.gestionincidencias.dto;

public record ConfiguracionSistemaDTO(

        Boolean crearTicketActivo,
        Boolean solicitudesRecursosActivo,
        Boolean reportesActivos,
        Boolean historialActivo,

        Boolean crearTicketCliente,
        Boolean crearTicketAgente,
        Boolean crearTicketSupervisor,
        Boolean crearTicketAdmin,

        Boolean solicitudesRecursosCliente,
        Boolean solicitudesRecursosAgente,
        Boolean solicitudesRecursosSupervisor,
        Boolean solicitudesRecursosAdmin,

        Boolean reportesCliente,
        Boolean reportesAgente,
        Boolean reportesSupervisor,
        Boolean reportesAdmin,

        Boolean historialCliente,
        Boolean historialAgente,
        Boolean historialSupervisor,
        Boolean historialAdmin

) {
}
