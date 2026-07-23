package com.practica.gestionincidencias.dto;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class EnlaceCompartidoResponseDTO {

    private Long id;

    private Integer ticketId;

    private String numeroTicket;

    private String correoDestinatario;

    private String token;

    private String enlace;

    private Boolean puedeVer;

    private Boolean puedeComentar;

    private Boolean puedeVerAdjuntos;

    private Boolean puedeSubirAdjuntos;

    private Boolean puedeCambiarEstado;

    private LocalDateTime fechaCreacion;

    private LocalDateTime fechaExpiracion;

    private Boolean activo;
}