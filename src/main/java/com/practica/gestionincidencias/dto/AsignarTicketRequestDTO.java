package com.practica.gestionincidencias.dto;

import jakarta.validation.constraints.NotNull;

public class AsignarTicketRequestDTO {

    @NotNull(message = "El agente es obligatorio.")
    private Integer agenteId;

    public AsignarTicketRequestDTO() {
    }

    public Integer getAgenteId() {
        return agenteId;
    }

    public void setAgenteId(Integer agenteId) {
        this.agenteId = agenteId;
    }
}