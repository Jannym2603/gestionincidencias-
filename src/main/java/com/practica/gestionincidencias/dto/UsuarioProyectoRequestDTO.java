package com.practica.gestionincidencias.dto;

import jakarta.validation.constraints.NotNull;

public class UsuarioProyectoRequestDTO {

    @NotNull(message = "El usuario es obligatorio.")
    private Integer usuarioId;

    @NotNull(message = "El proyecto es obligatorio.")
    private Integer proyectoId;

    public UsuarioProyectoRequestDTO() {
    }

    public Integer getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Integer usuarioId) {
        this.usuarioId = usuarioId;
    }

    public Integer getProyectoId() {
        return proyectoId;
    }

    public void setProyectoId(Integer proyectoId) {
        this.proyectoId = proyectoId;
    }
}