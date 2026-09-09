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


    // =====================================================
    // CAMPOS ANTERIORES
    // Se conservan por compatibilidad con registros previos.
    // =====================================================

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

    /*
     * Columnas antiguas conservadas únicamente por compatibilidad
     * con el esquema actual de PostgreSQL.
     */
    @Column(
            name = "variante_anterior",
            nullable = false,
            length = 1
    )
    @Builder.Default
    private String compatibilidadVisualAnterior = "A";

    @Column(
            name = "variante_nueva",
            nullable = false,
            length = 1
    )
    @Builder.Default
    private String compatibilidadVisualNueva = "A";


    // =====================================================
    // NUEVA AUDITORÍA DETALLADA
    // =====================================================

    @Column(
            name = "modulo",
            length = 100
    )
    private String modulo;

    @Column(
            name = "rol",
            length = 50
    )
    private String rol;

    @Column(
            name = "valor_anterior",
            length = 100
    )
    private String valorAnterior;

    @Column(
            name = "valor_nuevo",
            length = 100
    )
    private String valorNuevo;


    @Column(
            name = "fecha_cambio",
            nullable = false
    )
    private LocalDateTime fechaCambio;
}