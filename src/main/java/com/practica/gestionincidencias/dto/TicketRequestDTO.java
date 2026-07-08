package com.practica.gestionincidencias.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class TicketRequestDTO {

    @NotBlank(message = "El titulo es obligatorio.")
    private String titulo;

    @NotBlank(message = "La descripcion es obligatoria.")
    private String descripcion;

    @NotNull(message = "El tipo de incidencia es obligatorio.")
    private Integer tipoIncidenciaId;

    @NotNull(message = "El cliente es obligatorio.")
    private Integer clienteId;

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