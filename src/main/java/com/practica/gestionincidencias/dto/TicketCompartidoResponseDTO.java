package com.practica.gestionincidencias.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketCompartidoResponseDTO {

    private Integer ticketId;

    private String numeroTicket;

    private String titulo;

    private String descripcion;

    private String estado;

    private String prioridad;

    private String categoria;

    private String nombreCliente;

    private String nombreAgente;

    private Boolean puedeVer;

    private Boolean puedeComentar;

    private Boolean puedeVerAdjuntos;

    private Boolean puedeSubirAdjuntos;

    private Boolean puedeCambiarEstado;

    private LocalDateTime fechaCreacion;

    private LocalDateTime fechaExpiracion;
}