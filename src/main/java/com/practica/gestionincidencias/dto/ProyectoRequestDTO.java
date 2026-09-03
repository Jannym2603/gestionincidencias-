package com.practica.gestionincidencias.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ProyectoRequestDTO {

    @NotNull(message = "La compañía es obligatoria.")
    private Integer companiaId;

    @NotBlank(message = "El nombre del proyecto es obligatorio.")
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

    public ProyectoRequestDTO() {
    }

    public Integer getCompaniaId() {
        return companiaId;
    }

    public void setCompaniaId(Integer companiaId) {
        this.companiaId = companiaId;
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