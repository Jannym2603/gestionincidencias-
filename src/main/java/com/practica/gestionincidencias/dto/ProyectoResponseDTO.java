package com.practica.gestionincidencias.dto;

import java.time.LocalDateTime;

public class ProyectoResponseDTO {

    private Integer id;

    private Integer companiaId;
    private String companiaNombre;

    private String nombre;
    private String descripcion;
    private Boolean estado;

    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;

    public ProyectoResponseDTO() {
    }

    public ProyectoResponseDTO(
            Integer id,
            Integer companiaId,
            String companiaNombre,
            String nombre,
            String descripcion,
            Boolean estado,
            LocalDateTime fechaCreacion,
            LocalDateTime fechaActualizacion) {

        this.id = id;
        this.companiaId = companiaId;
        this.companiaNombre = companiaNombre;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.estado = estado;
        this.fechaCreacion = fechaCreacion;
        this.fechaActualizacion = fechaActualizacion;
    }

    public Integer getId() {
        return id;
    }

    public Integer getCompaniaId() {
        return companiaId;
    }

    public String getCompaniaNombre() {
        return companiaNombre;
    }

    public String getNombre() {
        return nombre;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public Boolean getEstado() {
        return estado;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public LocalDateTime getFechaActualizacion() {
        return fechaActualizacion;
    }
}