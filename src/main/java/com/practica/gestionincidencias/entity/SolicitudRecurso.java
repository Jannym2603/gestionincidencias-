package com.practica.gestionincidencias.entity;

import java.time.LocalDateTime;
import java.util.Set;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "solicitudes_recurso")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SolicitudRecurso {

    private static final Set<String> ESTADOS_FINALIZADOS =
            Set.of(
                    "RECIBIDO",
                    "ENTREGADO",
                    "CERRADO",
                    "CANCELADO"
            );

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /*
     * Cada solicitud de recurso pertenece a un único ticket.
     * Un ticket de tipo OPERATIVO no necesita este registro.
     */
    @OneToOne
    @JoinColumn(
            name = "ticket_id",
            nullable = false,
            unique = true
    )
    private Ticket ticket;

    @Column(
            nullable = false,
            length = 80
    )
    private String categoria;

    @Column(
            nullable = false,
            length = 150
    )
    private String recurso;

    @Builder.Default
    @Column(
            nullable = false
    )
    private Integer cantidad = 1;

    /*
     * El proveedor puede quedar vacío inicialmente.
     * Lo completa un usuario autorizado cuando
     * la solicitud sea enviada a un tercero.
     */
    @Column(
            length = 150
    )
    private String proveedor;

    @Builder.Default
    @Column(
            name = "estado_recurso",
            nullable = false,
            length = 40
    )
    private String estadoRecurso = "NUEVO";

    @Column(
            name = "fecha_solicitud_proveedor"
    )
    private LocalDateTime fechaSolicitudProveedor;

    @Column(
            name = "fecha_estimada_entrega"
    )
    private LocalDateTime fechaEstimadaEntrega;

    @Column(
            name = "fecha_recepcion"
    )
    private LocalDateTime fechaRecepcion;

    @Column(
            name = "fecha_entrega_cliente"
    )
    private LocalDateTime fechaEntregaCliente;

    @Column(
            columnDefinition = "TEXT"
    )
    private String observaciones;

    @Builder.Default
    @Column(
            name = "fecha_creacion",
            nullable = false
    )
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    @Column(
            name = "fecha_actualizacion"
    )
    private LocalDateTime fechaActualizacion;

    /*
     * Fecha en la que el sistema envió la alerta automática de retraso.
     * Queda en null mientras todavía no se haya notificado.
     */
    @Column(
            name = "fecha_notificacion_retraso"
    )
    private LocalDateTime fechaNotificacionRetraso;

    /*
     * No se guarda una columna RETRASADO en la base de datos.
     *
     * El retraso se calcula dinámicamente para evitar que el dato
     * quede desactualizado con el paso del tiempo.
     */
    @Transient
    public boolean estaRetrasada() {

        if (fechaEstimadaEntrega == null) {
            return false;
        }

        String estado =
                estadoRecurso == null
                        ? "NUEVO"
                        : estadoRecurso
                                .trim()
                                .toUpperCase();

        if (ESTADOS_FINALIZADOS.contains(estado)) {
            return false;
        }

        return fechaEstimadaEntrega
                .isBefore(
                        LocalDateTime.now()
                );
    }
}
