package com.practica.gestionincidencias.dto;

import java.time.LocalDateTime;

public class TicketResponseDTO {

    private Integer id;
    private String numeroTicket;
    private String titulo;
    private String descripcion;

    private Integer tipoIncidenciaId;
    private String tipoIncidenciaNombre;

    private Integer clienteId;
    private String clienteNombre;
    private String clienteCorreo;

    private Integer agenteId;
    private String agenteNombre;

    private String estado;
    private String prioridad;
    private String severidad;
    private String criticidad;
    private String impacto;
    private String urgencia;

    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;
    private LocalDateTime fechaResolucion;

    public TicketResponseDTO() {
    }

    public TicketResponseDTO(Integer id, String numeroTicket, String titulo, String descripcion,
                             Integer tipoIncidenciaId, String tipoIncidenciaNombre,
                             Integer clienteId, String clienteNombre, String clienteCorreo,
                             Integer agenteId, String agenteNombre,
                             String estado, String prioridad, String severidad, String criticidad,
                             String impacto, String urgencia,
                             LocalDateTime fechaCreacion, LocalDateTime fechaActualizacion,
                             LocalDateTime fechaResolucion) {
        this.id = id;
        this.numeroTicket = numeroTicket;
        this.titulo = titulo;
        this.descripcion = descripcion;
        this.tipoIncidenciaId = tipoIncidenciaId;
        this.tipoIncidenciaNombre = tipoIncidenciaNombre;
        this.clienteId = clienteId;
        this.clienteNombre = clienteNombre;
        this.clienteCorreo = clienteCorreo;
        this.agenteId = agenteId;
        this.agenteNombre = agenteNombre;
        this.estado = estado;
        this.prioridad = prioridad;
        this.severidad = severidad;
        this.criticidad = criticidad;
        this.impacto = impacto;
        this.urgencia = urgencia;
        this.fechaCreacion = fechaCreacion;
        this.fechaActualizacion = fechaActualizacion;
        this.fechaResolucion = fechaResolucion;
    }

    public Integer getId() {
        return id;
    }

    public String getNumeroTicket() {
        return numeroTicket;
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

    public String getTipoIncidenciaNombre() {
        return tipoIncidenciaNombre;
    }

    public Integer getClienteId() {
        return clienteId;
    }

    public String getClienteNombre() {
        return clienteNombre;
    }

    public String getClienteCorreo() {
        return clienteCorreo;
    }

    public Integer getAgenteId() {
        return agenteId;
    }

    public String getAgenteNombre() {
        return agenteNombre;
    }

    public String getEstado() {
        return estado;
    }

    public String getPrioridad() {
        return prioridad;
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

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public LocalDateTime getFechaActualizacion() {
        return fechaActualizacion;
    }

    public LocalDateTime getFechaResolucion() {
        return fechaResolucion;
    }
}