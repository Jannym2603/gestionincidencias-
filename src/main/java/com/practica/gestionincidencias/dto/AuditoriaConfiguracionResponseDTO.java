package com.practica.gestionincidencias.dto;

import java.time.LocalDateTime;

public record AuditoriaConfiguracionResponseDTO(
        Integer id,
        Integer usuarioId,
        String usuarioNombre,
        String usuarioCorreo,
        Boolean crearTicketAnterior,
        Boolean crearTicketNuevo,
        Boolean reportesAnterior,
        Boolean reportesNuevo,
        Boolean historialAnterior,
        Boolean historialNuevo,
        String varianteAnterior,
        String varianteNueva,
        LocalDateTime fechaCambio
) {
}