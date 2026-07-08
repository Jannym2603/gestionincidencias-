package com.practica.gestionincidencias.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CambiarPrioridadTicketRequestDTO {

    @NotBlank(message = "La prioridad es obligatoria.")
    private String prioridad;

    @NotNull(message = "El usuario responsable del cambio es obligatorio.")
    private Integer usuarioId;

    private String justificacion;

    public CambiarPrioridadTicketRequestDTO() {
    }

    public String getPrioridad() {
        return prioridad;
    }

    public void setPrioridad(String prioridad) {
        this.prioridad = prioridad;
    }

    public Integer getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Integer usuarioId) {
        this.usuarioId = usuarioId;
    }

    public String getJustificacion() {
        return justificacion;
    }

    public void setJustificacion(String justificacion) {
        this.justificacion = justificacion;
    }
}