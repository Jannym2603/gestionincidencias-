package com.practica.gestionincidencias.dto;

import java.time.LocalDateTime;

public class ComentarioResponseDTO {

    private Integer id;
    private Integer ticketId;
    private String numeroTicket;
    private Integer usuarioId;
    private String nombreUsuario;
    private String contenido;
    private String tipoComentario;
    private LocalDateTime fechaCreacion;

    public ComentarioResponseDTO() {
    }

    public ComentarioResponseDTO(Integer id, Integer ticketId, String numeroTicket,
                                 Integer usuarioId, String nombreUsuario,
                                 String contenido, String tipoComentario,
                                 LocalDateTime fechaCreacion) {
        this.id = id;
        this.ticketId = ticketId;
        this.numeroTicket = numeroTicket;
        this.usuarioId = usuarioId;
        this.nombreUsuario = nombreUsuario;
        this.contenido = contenido;
        this.tipoComentario = tipoComentario;
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

    public String getContenido() {
        return contenido;
    }

    public String getTipoComentario() {
        return tipoComentario;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }
}