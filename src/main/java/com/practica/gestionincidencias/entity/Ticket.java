package com.practica.gestionincidencias.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "tickets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(
            name = "numero_ticket",
            nullable = false,
            unique = true,
            length = 30
    )
    private String numeroTicket;

    @Column(
            nullable = false,
            length = 150
    )
    private String titulo;

    @Column(
            nullable = false,
            columnDefinition = "TEXT"
    )
    private String descripcion;

    @ManyToOne
    @JoinColumn(
            name = "tipo_incidencia_id",
            nullable = false
    )
    private TipoIncidencia tipoIncidencia;

    @ManyToOne
    @JoinColumn(
            name = "cliente_id",
            nullable = false
    )
    private Usuario cliente;

    @ManyToOne
    @JoinColumn(
            name = "agente_asignado_id"
    )
    private Usuario agenteAsignado;

    @ManyToOne
    @JoinColumn(
            name = "proyecto_id",
            nullable = false
    )
    private Proyecto proyecto;

    /*
     * Tipo de atención:
     *
     * OPERATIVO
     * RECURSO_EXTERNO
     */
    @Builder.Default
    @Column(
            name = "tipo_atencion",
            nullable = false,
            length = 30
    )
    private String tipoAtencion = "OPERATIVO";

    @Column(
            nullable = false,
            length = 30
    )
    private String estado;

    @Column(
            nullable = false,
            length = 30
    )
    private String prioridad;

    @Column(length = 30)
    private String severidad;

    @Column(length = 30)
    private String criticidad;

    @Column(length = 30)
    private String impacto;

    @Column(length = 30)
    private String urgencia;


    /*
     * ==========================================
     * FECHAS PRINCIPALES DEL TICKET
     * ==========================================
     */

    /*
     * Momento en que se creó el ticket.
     *
     * Desde aquí comienza a correr el
     * tiempo abierto.
     */
    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;


    @Column(name = "fecha_actualizacion")
    private LocalDateTime fechaActualizacion;


    /*
     * Momento en que técnicamente se resolvió
     * el incidente.
     *
     * RESUELTO no significa que el ticket
     * esté cerrado.
     */
    @Column(name = "fecha_resolucion")
    private LocalDateTime fechaResolucion;


    /*
     * NUEVO:
     *
     * Momento en que el ticket llegó realmente
     * al estado CERRADO.
     *
     * El contador de tiempo abierto se detendrá
     * únicamente con esta fecha.
     */
    @Column(name = "fecha_cierre")
    private LocalDateTime fechaCierre;


    /*
     * ==========================================
     * SLA
     * ==========================================
     *
     * Se conservan por compatibilidad con
     * el sistema actual.
     *
     * Más adelante el tiempo abierto del ticket
     * se mostrará separado del SLA.
     */

    @Column(name = "fecha_limite_respuesta")
    private LocalDateTime fechaLimiteRespuesta;

    @Column(name = "fecha_primera_respuesta")
    private LocalDateTime fechaPrimeraRespuesta;

    @Column(name = "fecha_limite_resolucion")
    private LocalDateTime fechaLimiteResolucion;

    @Column(name = "sla_respuesta_cumplido")
    private Boolean slaRespuestaCumplido;

    @Column(name = "sla_resolucion_cumplido")
    private Boolean slaResolucionCumplido;
}