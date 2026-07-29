package com.practica.gestionincidencias.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "auditoria_configuracion")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditoriaConfiguracion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "usuario_id")
    private Integer usuarioId;

    @Column(
            name = "usuario_nombre",
            nullable = false,
            length = 200
    )
    private String usuarioNombre;

    @Column(
            name = "usuario_correo",
            nullable = false,
            length = 150
    )
    private String usuarioCorreo;

    @Column(
            name = "crear_ticket_anterior",
            nullable = false
    )
    private Boolean crearTicketAnterior;

    @Column(
            name = "crear_ticket_nuevo",
            nullable = false
    )
    private Boolean crearTicketNuevo;

    @Column(
            name = "reportes_anterior",
            nullable = false
    )
    private Boolean reportesAnterior;

    @Column(
            name = "reportes_nuevo",
            nullable = false
    )
    private Boolean reportesNuevo;

    @Column(
            name = "historial_anterior",
            nullable = false
    )
    private Boolean historialAnterior;

    @Column(
            name = "historial_nuevo",
            nullable = false
    )
    private Boolean historialNuevo;

    @Column(
            name = "variante_anterior",
            nullable = false,
            length = 1
    )
    private String varianteAnterior;

    @Column(
            name = "variante_nueva",
            nullable = false,
            length = 1
    )
    private String varianteNueva;

    @Column(
            name = "fecha_cambio",
            nullable = false
    )
    private LocalDateTime fechaCambio;
}