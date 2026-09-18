package com.practica.gestionincidencias.entity;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
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


    /*
     * =====================================================
     * FECHAS DE ENTREGA
     * =====================================================
     */

    /*
     * Primera fecha estimada que se registró.
     *
     * Esta fecha se conserva para poder saber si posteriormente
     * hubo una reprogramación o retraso.
     */
    @Column(
            name = "fecha_estimada_entrega_original"
    )
    private LocalDateTime fechaEstimadaEntregaOriginal;


    /*
     * Fecha estimada actualmente informada.
     *
     * Esta sí puede cambiar si la llegada de la pieza
     * es reprogramada.
     */
    @Column(
            name = "fecha_estimada_entrega"
    )
    private LocalDateTime fechaEstimadaEntrega;


    /*
     * Motivo general del retraso o reprogramación.
     *
     * No asigna culpa a ninguna persona o empresa.
     */
    @Column(
            name = "motivo_retraso",
            length = 100
    )
    private String motivoRetraso;


    /*
     * Explicación adicional opcional.
     */
    @Column(
            name = "detalle_retraso",
            columnDefinition = "TEXT"
    )
    private String detalleRetraso;


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
     * Fecha en la que el sistema ya envió una notificación
     * indicando que la pieza se encontraba retrasada.
     */
    @Column(
            name = "fecha_notificacion_retraso"
    )
    private LocalDateTime fechaNotificacionRetraso;


    /*
     * =====================================================
     * CÁLCULO DEL RETRASO
     * =====================================================
     */


    /*
     * Para solicitudes antiguas que todavía no tengan
     * fecha original, se usa la fecha estimada actual.
     */
    @Transient
    public LocalDateTime obtenerFechaBaseRetraso() {

        if (fechaEstimadaEntregaOriginal != null) {
            return fechaEstimadaEntregaOriginal;
        }

        return fechaEstimadaEntrega;
    }


    /*
     * Indica si actualmente la pieza está retrasada.
     */
    @Transient
    public boolean estaRetrasada() {

        LocalDateTime fechaBase =
                obtenerFechaBaseRetraso();

        if (fechaBase == null) {
            return false;
        }

        String estado =
                estadoRecurso == null
                        ? "NUEVO"
                        : estadoRecurso
                                .trim()
                                .toUpperCase();

        /*
         * Una vez recibida, entregada, cerrada o cancelada,
         * ya no aparece como retraso activo.
         */
        if (ESTADOS_FINALIZADOS.contains(estado)) {
            return false;
        }

        return LocalDateTime.now()
                .isAfter(fechaBase);
    }


    /*
     * Indica si la fecha estimada fue reprogramada.
     */
    @Transient
    public boolean estaReprogramada() {

        if (fechaEstimadaEntregaOriginal == null
                || fechaEstimadaEntrega == null) {

            return false;
        }

        return !fechaEstimadaEntregaOriginal
                .equals(fechaEstimadaEntrega);
    }


    /*
     * Cantidad de días de retraso.
     *
     * Mientras la pieza no se haya recibido:
     * fecha actual - fecha original.
     *
     * Después de recibirla:
     * fecha recepción - fecha original.
     *
     * De esa manera el contador deja de crecer cuando
     * la pieza llega.
     */
    @Transient
    public long getDiasRetraso() {

        LocalDateTime fechaBase =
                obtenerFechaBaseRetraso();

        if (fechaBase == null) {
            return 0;
        }

        LocalDateTime fechaReferencia =
                fechaRecepcion != null
                        ? fechaRecepcion
                        : LocalDateTime.now();

        if (!fechaReferencia.isAfter(fechaBase)) {
            return 0;
        }

        long dias =
                ChronoUnit.DAYS.between(
                        fechaBase.toLocalDate(),
                        fechaReferencia.toLocalDate()
                );

        return Math.max(
                dias,
                0
        );
    }


    /*
     * Permite saber si históricamente la pieza llegó
     * después de la fecha original.
     */
    @Transient
    public boolean tuvoRetraso() {

        LocalDateTime fechaBase =
                obtenerFechaBaseRetraso();

        if (fechaBase == null
                || fechaRecepcion == null) {

            return false;
        }

        return fechaRecepcion
                .isAfter(fechaBase);
    }


    /*
     * Situación visual que después mostraremos
     * en la pantalla.
     *
     * No modifica estadoRecurso.
     */
    @Transient
    public String getSituacionEntrega() {

        String estado =
                estadoRecurso == null
                        ? "NUEVO"
                        : estadoRecurso
                                .trim()
                                .toUpperCase();

        if ("CANCELADO".equals(estado)) {
            return "CANCELADO";
        }

        if (Set.of(
                "RECIBIDO",
                "ENTREGADO",
                "CERRADO"
        ).contains(estado)) {

            if (tuvoRetraso()) {
                return "RECIBIDO_CON_RETRASO";
            }

            return "RECIBIDO_EN_TIEMPO";
        }

        if (estaRetrasada()) {
            return "RETRASADO";
        }

        if (estaReprogramada()) {
            return "REPROGRAMADO";
        }

        if (obtenerFechaBaseRetraso() == null) {
            return "SIN_FECHA";
        }

        return "EN_TIEMPO";
    }
}