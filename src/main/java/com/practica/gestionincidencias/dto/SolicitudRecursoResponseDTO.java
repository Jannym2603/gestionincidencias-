package com.practica.gestionincidencias.dto;

import java.time.LocalDateTime;

public class SolicitudRecursoResponseDTO {

    private Integer id;

    private Integer ticketId;
    private String numeroTicket;
    private String tituloTicket;
    private String tipoAtencion;

    private Integer clienteId;
    private String clienteNombre;

    private Integer proyectoId;
    private String proyectoNombre;

    private Integer companiaId;
    private String companiaNombre;

    private String categoria;
    private String recurso;
    private Integer cantidad;

    private String proveedor;
    private String estadoRecurso;
    private Boolean retrasada;

    private LocalDateTime fechaSolicitudProveedor;
    private LocalDateTime fechaEstimadaEntrega;
    private LocalDateTime fechaRecepcion;
    private LocalDateTime fechaEntregaCliente;

    private String observaciones;

    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;

    public SolicitudRecursoResponseDTO() {
    }

    public SolicitudRecursoResponseDTO(
            Integer id,
            Integer ticketId,
            String numeroTicket,
            String tituloTicket,
            String tipoAtencion,
            Integer clienteId,
            String clienteNombre,
            Integer proyectoId,
            String proyectoNombre,
            Integer companiaId,
            String companiaNombre,
            String categoria,
            String recurso,
            Integer cantidad,
            String proveedor,
            String estadoRecurso,
            Boolean retrasada,
            LocalDateTime fechaSolicitudProveedor,
            LocalDateTime fechaEstimadaEntrega,
            LocalDateTime fechaRecepcion,
            LocalDateTime fechaEntregaCliente,
            String observaciones,
            LocalDateTime fechaCreacion,
            LocalDateTime fechaActualizacion) {

        this.id = id;

        this.ticketId = ticketId;
        this.numeroTicket = numeroTicket;
        this.tituloTicket = tituloTicket;
        this.tipoAtencion = tipoAtencion;

        this.clienteId = clienteId;
        this.clienteNombre = clienteNombre;

        this.proyectoId = proyectoId;
        this.proyectoNombre = proyectoNombre;

        this.companiaId = companiaId;
        this.companiaNombre = companiaNombre;

        this.categoria = categoria;
        this.recurso = recurso;
        this.cantidad = cantidad;

        this.proveedor = proveedor;
        this.estadoRecurso = estadoRecurso;
        this.retrasada = retrasada;

        this.fechaSolicitudProveedor = fechaSolicitudProveedor;
        this.fechaEstimadaEntrega = fechaEstimadaEntrega;
        this.fechaRecepcion = fechaRecepcion;
        this.fechaEntregaCliente = fechaEntregaCliente;

        this.observaciones = observaciones;

        this.fechaCreacion = fechaCreacion;
        this.fechaActualizacion = fechaActualizacion;
    }

    public Integer getId() {
        return id;
    }

    public Integer getTicketId() {
        return ticketId;
    }

    public String getNumeroTicket() {
        return numeroTicket;
    }

    public String getTituloTicket() {
        return tituloTicket;
    }

    public String getTipoAtencion() {
        return tipoAtencion;
    }

    public Integer getClienteId() {
        return clienteId;
    }

    public String getClienteNombre() {
        return clienteNombre;
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

    public String getCategoria() {
        return categoria;
    }

    public String getRecurso() {
        return recurso;
    }

    public Integer getCantidad() {
        return cantidad;
    }

    public String getProveedor() {
        return proveedor;
    }

    public String getEstadoRecurso() {
        return estadoRecurso;
    }

    public Boolean getRetrasada() {
        return retrasada;
    }

    public LocalDateTime getFechaSolicitudProveedor() {
        return fechaSolicitudProveedor;
    }

    public LocalDateTime getFechaEstimadaEntrega() {
        return fechaEstimadaEntrega;
    }

    public LocalDateTime getFechaRecepcion() {
        return fechaRecepcion;
    }

    public LocalDateTime getFechaEntregaCliente() {
        return fechaEntregaCliente;
    }

    public String getObservaciones() {
        return observaciones;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public LocalDateTime getFechaActualizacion() {
        return fechaActualizacion;
    }
}
