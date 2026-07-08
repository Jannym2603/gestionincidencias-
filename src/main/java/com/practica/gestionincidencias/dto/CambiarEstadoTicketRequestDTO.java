package com.practica.gestionincidencias.dto;

import jakarta.validation.constraints.NotBlank;

public class CambiarEstadoTicketRequestDTO {

    @NotBlank(message = "El estado es obligatorio.")
    private String estado;

    private String notaResolucion;

    public CambiarEstadoTicketRequestDTO() {
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public String getNotaResolucion() {
        return notaResolucion;
    }

    public void setNotaResolucion(String notaResolucion) {
        this.notaResolucion = notaResolucion;
    }
}