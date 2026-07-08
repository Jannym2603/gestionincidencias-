package com.practica.gestionincidencias.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class ComentarioRequestDTO {

    @NotNull(message = "El ticket es obligatorio.")
    private Integer ticketId;

    @NotNull(message = "El usuario es obligatorio.")
    private Integer usuarioId;

    @NotBlank(message = "El contenido del comentario es obligatorio.")
    private String contenido;

    @NotBlank(message = "El tipo de comentario es obligatorio.")
    private String tipoComentario;

    public ComentarioRequestDTO() {
    }

    public Integer getTicketId() {
        return ticketId;
    }

    public void setTicketId(Integer ticketId) {
        this.ticketId = ticketId;
    }

    public Integer getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Integer usuarioId) {
        this.usuarioId = usuarioId;
    }

    public String getContenido() {
        return contenido;
    }

    public void setContenido(String contenido) {
        this.contenido = contenido;
    }

    public String getTipoComentario() {
        return tipoComentario;
    }

    public void setTipoComentario(String tipoComentario) {
        this.tipoComentario = tipoComentario;
    }
}