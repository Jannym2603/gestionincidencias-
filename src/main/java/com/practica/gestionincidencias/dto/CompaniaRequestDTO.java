package com.practica.gestionincidencias.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CompaniaRequestDTO {

    @NotBlank(message = "El nombre de la compañía es obligatorio.")
    @Size(
            max = 150,
            message = "El nombre no puede superar los 150 caracteres."
    )
    private String nombre;

    @Size(
            max = 1000,
            message = "La descripción no puede superar los 1000 caracteres."
    )
    private String descripcion;

    private Boolean estado;

    public CompaniaRequestDTO() {
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public Boolean getEstado() {
        return estado;
    }

    public void setEstado(Boolean estado) {
        this.estado = estado;
    }
}