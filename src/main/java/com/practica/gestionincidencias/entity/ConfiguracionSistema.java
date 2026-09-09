package com.practica.gestionincidencias.entity;

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
@Table(name = "configuracion_sistema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConfiguracionSistema {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "crear_ticket_activo", nullable = false)
    private Boolean crearTicketActivo;

    @Column(name = "solicitudes_recursos_activo", nullable = false)
    @Builder.Default
    private Boolean solicitudesRecursosActivo = true;

    @Column(name = "reportes_activos", nullable = false)
    private Boolean reportesActivos;

    @Column(name = "historial_activo", nullable = false)
    private Boolean historialActivo;

    @Column(name = "crear_ticket_cliente", nullable = false)
    @Builder.Default
    private Boolean crearTicketCliente = true;

    @Column(name = "crear_ticket_agente", nullable = false)
    @Builder.Default
    private Boolean crearTicketAgente = true;

    @Column(name = "crear_ticket_supervisor", nullable = false)
    @Builder.Default
    private Boolean crearTicketSupervisor = true;

    @Column(name = "crear_ticket_admin", nullable = false)
    @Builder.Default
    private Boolean crearTicketAdmin = true;

    @Column(name = "solicitudes_recursos_cliente", nullable = false)
    @Builder.Default
    private Boolean solicitudesRecursosCliente = true;

    @Column(name = "solicitudes_recursos_agente", nullable = false)
    @Builder.Default
    private Boolean solicitudesRecursosAgente = true;

    @Column(name = "solicitudes_recursos_supervisor", nullable = false)
    @Builder.Default
    private Boolean solicitudesRecursosSupervisor = true;

    @Column(name = "solicitudes_recursos_admin", nullable = false)
    @Builder.Default
    private Boolean solicitudesRecursosAdmin = true;

    @Column(name = "reportes_cliente", nullable = false)
    @Builder.Default
    private Boolean reportesCliente = true;

    @Column(name = "reportes_agente", nullable = false)
    @Builder.Default
    private Boolean reportesAgente = true;

    @Column(name = "reportes_supervisor", nullable = false)
    @Builder.Default
    private Boolean reportesSupervisor = true;

    @Column(name = "reportes_admin", nullable = false)
    @Builder.Default
    private Boolean reportesAdmin = true;

    @Column(name = "historial_cliente", nullable = false)
    @Builder.Default
    private Boolean historialCliente = true;

    @Column(name = "historial_agente", nullable = false)
    @Builder.Default
    private Boolean historialAgente = true;

    @Column(name = "historial_supervisor", nullable = false)
    @Builder.Default
    private Boolean historialSupervisor = true;

    @Column(name = "historial_admin", nullable = false)
    @Builder.Default
    private Boolean historialAdmin = true;

    /*
     * Campo interno conservado únicamente para compatibilidad
     * con la columna existente en PostgreSQL.
     */
    @Column(name = "variante_visual", nullable = false, length = 1)
    @Builder.Default
    private String compatibilidadVisual = "A";
}
