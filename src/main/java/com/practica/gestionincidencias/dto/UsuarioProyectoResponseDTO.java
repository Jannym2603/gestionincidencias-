package com.practica.gestionincidencias.dto;

import java.time.LocalDateTime;

public class UsuarioProyectoResponseDTO {

    private Integer id;

    private Integer usuarioId;
    private String usuarioNombre;
    private String usuarioCorreo;

    private Integer proyectoId;
    private String proyectoNombre;

    private Integer companiaId;
    private String companiaNombre;

    private Boolean estado;
    private LocalDateTime fechaAsignacion;

    public UsuarioProyectoResponseDTO() {
    }

    public UsuarioProyectoResponseDTO(
            Integer id,
            Integer usuarioId,
            String usuarioNombre,
            String usuarioCorreo,
            Integer proyectoId,
            String proyectoNombre,
            Integer companiaId,
            String companiaNombre,
            Boolean estado,
            LocalDateTime fechaAsignacion) {

        this.id = id;
        this.usuarioId = usuarioId;
        this.usuarioNombre = usuarioNombre;
        this.usuarioCorreo = usuarioCorreo;
        this.proyectoId = proyectoId;
        this.proyectoNombre = proyectoNombre;
        this.companiaId = companiaId;
        this.companiaNombre = companiaNombre;
        this.estado = estado;
        this.fechaAsignacion = fechaAsignacion;
    }

    public Integer getId() {
        return id;
    }

    public Integer getUsuarioId() {
        return usuarioId;
    }

    public String getUsuarioNombre() {
        return usuarioNombre;
    }

    public String getUsuarioCorreo() {
        return usuarioCorreo;
    }

    public Integer getProyectoId() {
        return proyectoId;
    }

    public String getProyectoNombre() {
        return proyectoNombre;
    }

    public Integer getCompaniaId() {
        return companiaId;
    }

    public String getCompaniaNombre() {
        return companiaNombre;
    }

    public Boolean getEstado() {
        return estado;
    }

    public LocalDateTime getFechaAsignacion() {
        return fechaAsignacion;
    }
}