package com.practica.gestionincidencias.dto;

public record ConfiguracionSistemaDTO(
        Boolean crearTicketActivo,
        Boolean reportesActivos,
        Boolean historialActivo,
        String varianteVisual
) {
}