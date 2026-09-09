package com.practica.gestionincidencias.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class SolicitudRecursoRequestDTO {

    @NotBlank(message = "La categoría del recurso es obligatoria.")
    private String categoria;

    @NotBlank(message = "El recurso solicitado es obligatorio.")
    private String recurso;

    @NotNull(message = "La cantidad es obligatoria.")
    @Min(value = 1, message = "La cantidad debe ser mayor o igual a 1.")
    private Integer cantidad;

    private String observaciones;

    public SolicitudRecursoRequestDTO() {
    }

    public String getCategoria() {
        return categoria;
    }

    public String getRecurso() {
        return recurso;
    }

    public Integer getCantidad() {
        return cantidad;
    }

    public String getObservaciones() {
        return observaciones;
    }

    public void setCategoria(String categoria) {
        this.categoria = categoria;
    }

    public void setRecurso(String recurso) {
        this.recurso = recurso;
    }

    public void setCantidad(Integer cantidad) {
        this.cantidad = cantidad;
    }

    public void setObservaciones(String observaciones) {
        this.observaciones = observaciones;
    }
}
