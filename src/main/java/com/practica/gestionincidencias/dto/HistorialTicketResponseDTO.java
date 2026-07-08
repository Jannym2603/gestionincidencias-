package com.practica.gestionincidencias.dto;

import java.time.LocalDateTime;

public class HistorialTicketResponseDTO {

    private Integer id;
    private Integer ticketId;
    private String numeroTicket;
    private Integer usuarioId;
    private String nombreUsuario;
    private String accion;
    private String valorAnterior;
    private String valorNuevo;
    private String descripcion;
    private LocalDateTime fechaCreacion;

    public HistorialTicketResponseDTO() {
    }

    public HistorialTicketResponseDTO(Integer id, Integer ticketId, String numeroTicket,
                                      Integer usuarioId, String nombreUsuario,
                                      String accion, String valorAnterior, String valorNuevo,
                                      String descripcion, LocalDateTime fechaCreacion) {
        this.id = id;
        this.ticketId = ticketId;
        this.numeroTicket = numeroTicket;
        this.usuarioId = usuarioId;
        this.nombreUsuario = nombreUsuario;
        this.accion = accion;
        this.valorAnterior = valorAnterior;
        this.valorNuevo = valorNuevo;
        this.descripcion = descripcion;
        this.fechaCreacion = fechaCreacion;
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

    public Integer getUsuarioId() {
        return usuarioId;
    }

    public String getNombreUsuario() {
        return nombreUsuario;
    }

    public String getAccion() {
        return accion;
    }

    public String getValorAnterior() {
        return valorAnterior;
    }

    public String getValorNuevo() {
        return valorNuevo;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }
}