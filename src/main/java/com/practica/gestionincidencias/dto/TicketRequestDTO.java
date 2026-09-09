package com.practica.gestionincidencias.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public class TicketRequestDTO {

    @NotBlank(message = "El título es obligatorio.")
    private String titulo;

    @NotBlank(message = "La descripción es obligatoria.")
    private String descripcion;

    @NotNull(message = "El tipo de incidencia es obligatorio.")
    private Integer tipoIncidenciaId;

    @NotNull(message = "El cliente es obligatorio.")
    private Integer clienteId;

    @NotNull(message = "El proyecto es obligatorio.")
    private Integer proyectoId;

    @NotBlank(message = "El tipo de atención es obligatorio.")
    @Pattern(
            regexp = "OPERATIVO|RECURSO_EXTERNO",
            message = "El tipo de atención no es válido."
    )
    private String tipoAtencion;

    @Valid
    private SolicitudRecursoRequestDTO solicitudRecurso;

    private String severidad;
    private String criticidad;

    @NotBlank(message = "El impacto es obligatorio.")
    private String impacto;

    @NotBlank(message = "La urgencia es obligatoria.")
    private String urgencia;

    public TicketRequestDTO() {
    }

    public String getTitulo() {
        return titulo;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public Integer getTipoIncidenciaId() {
        return tipoIncidenciaId;
    }

    public Integer getClienteId() {
        return clienteId;
    }

    public Integer getProyectoId() {
        return proyectoId;
    }

    public String getTipoAtencion() {
        return tipoAtencion;
    }

    public SolicitudRecursoRequestDTO getSolicitudRecurso() {
        return solicitudRecurso;
    }

    public String getSeveridad() {
        return severidad;
    }

    public String getCriticidad() {
        return criticidad;
    }

    public String getImpacto() {
        return impacto;
    }

    public String getUrgencia() {
        return urgencia;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public void setTipoIncidenciaId(Integer tipoIncidenciaId) {
        this.tipoIncidenciaId = tipoIncidenciaId;
    }

    public void setClienteId(Integer clienteId) {
        this.clienteId = clienteId;
    }

    public void setProyectoId(Integer proyectoId) {
        this.proyectoId = proyectoId;
    }

    public void setTipoAtencion(String tipoAtencion) {
        this.tipoAtencion = tipoAtencion;
    }

    public void setSolicitudRecurso(
            SolicitudRecursoRequestDTO solicitudRecurso) {
        this.solicitudRecurso = solicitudRecurso;
    }

    public void setSeveridad(String severidad) {
        this.severidad = severidad;
    }

    public void setCriticidad(String criticidad) {
        this.criticidad = criticidad;
    }

    public void setImpacto(String impacto) {
        this.impacto = impacto;
    }

    public void setUrgencia(String urgencia) {
        this.urgencia = urgencia;
    }
}
