package com.practica.gestionincidencias.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CrearEnlaceCompartidoRequestDTO {

    @NotBlank(message = "El correo del destinatario es obligatorio")
    @Email(message = "El correo del destinatario no es válido")
    private String correoDestinatario;

    private Boolean puedeVer = true;

    private Boolean puedeComentar = false;

    private Boolean puedeVerAdjuntos = false;

    private Boolean puedeSubirAdjuntos = false;

    private Boolean puedeCambiarEstado = false;

    private LocalDateTime fechaExpiracion;
}