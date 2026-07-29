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

    @Column(
        name = "crear_ticket_activo",
        nullable = false
    )
    private Boolean crearTicketActivo;

    @Column(
        name = "reportes_activos",
        nullable = false
    )
    private Boolean reportesActivos;

    @Column(
        name = "historial_activo",
        nullable = false
    )
    private Boolean historialActivo;

    @Column(
        name = "variante_visual",
        nullable = false,
        length = 1
    )
    private String varianteVisual;
}