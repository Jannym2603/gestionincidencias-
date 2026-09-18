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

    /*
     * Indica si actualmente la pieza está retrasada.
     */
    private Boolean retrasada;

    /*
     * Situación calculada para mostrar en pantalla:
     *
     * EN_TIEMPO
     * REPROGRAMADO
     * RETRASADO
     * RECIBIDO_EN_TIEMPO
     * RECIBIDO_CON_RETRASO
     * CANCELADO
     * SIN_FECHA
     */
    private String situacionEntrega;

    /*
     * Cantidad de días de retraso.
     */
    private Long diasRetraso;

    private LocalDateTime fechaSolicitudProveedor;

    /*
     * Primera fecha estimada registrada.
     * No cambia cuando se reprograma.
     */
    private LocalDateTime fechaEstimadaEntregaOriginal;

    /*
     * Fecha estimada actual.
     */
    private LocalDateTime fechaEstimadaEntrega;

    private LocalDateTime fechaRecepcion;
    private LocalDateTime fechaEntregaCliente;

    /*
     * Información neutral sobre el retraso.
     */
    private String motivoRetraso;
    private String detalleRetraso;

    private String observaciones;

    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;


    public SolicitudRecursoResponseDTO() {
    }


    /*
     * Constructor completo nuevo.
     */
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
            String situacionEntrega,
            Long diasRetraso,
            LocalDateTime fechaSolicitudProveedor,
            LocalDateTime fechaEstimadaEntregaOriginal,
            LocalDateTime fechaEstimadaEntrega,
            LocalDateTime fechaRecepcion,
            LocalDateTime fechaEntregaCliente,
            String motivoRetraso,
            String detalleRetraso,
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
        this.situacionEntrega = situacionEntrega;
        this.diasRetraso = diasRetraso;

        this.fechaSolicitudProveedor =
                fechaSolicitudProveedor;

        this.fechaEstimadaEntregaOriginal =
                fechaEstimadaEntregaOriginal;

        this.fechaEstimadaEntrega =
                fechaEstimadaEntrega;

        this.fechaRecepcion =
                fechaRecepcion;

        this.fechaEntregaCliente =
                fechaEntregaCliente;

        this.motivoRetraso =
                motivoRetraso;

        this.detalleRetraso =
                detalleRetraso;

        this.observaciones =
                observaciones;

        this.fechaCreacion =
                fechaCreacion;

        this.fechaActualizacion =
                fechaActualizacion;
    }


    /*
     * Constructor anterior.
     *
     * Lo dejamos temporalmente para que el proyecto
     * continúe compilando mientras modificamos
     * SolicitudRecursoController.
     */
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

        this(
                id,
                ticketId,
                numeroTicket,
                tituloTicket,
                tipoAtencion,
                clienteId,
                clienteNombre,
                proyectoId,
                proyectoNombre,
                companiaId,
                companiaNombre,
                categoria,
                recurso,
                cantidad,
                proveedor,
                estadoRecurso,
                retrasada,
                null,
                0L,
                fechaSolicitudProveedor,
                fechaEstimadaEntrega,
                fechaEstimadaEntrega,
                fechaRecepcion,
                fechaEntregaCliente,
                null,
                null,
                observaciones,
                fechaCreacion,
                fechaActualizacion
        );
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

    public String getSituacionEntrega() {
        return situacionEntrega;
    }

    public Long getDiasRetraso() {
        return diasRetraso;
    }

    public LocalDateTime getFechaSolicitudProveedor() {
        return fechaSolicitudProveedor;
    }

    public LocalDateTime getFechaEstimadaEntregaOriginal() {
        return fechaEstimadaEntregaOriginal;
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

    public String getMotivoRetraso() {
        return motivoRetraso;
    }

    public String getDetalleRetraso() {
        return detalleRetraso;
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