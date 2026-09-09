package com.practica.gestionincidencias.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "usuario_proyectos",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_usuario_proyecto",
                        columnNames = {
                                "usuario_id",
                                "proyecto_id"
                        }
                )
        },
        indexes = {
                @Index(
                        name = "idx_usuario_proyecto_usuario",
                        columnList = "usuario_id"
                ),
                @Index(
                        name = "idx_usuario_proyecto_proyecto",
                        columnList = "proyecto_id"
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UsuarioProyecto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(
            name = "usuario_id",
            nullable = false
    )
    private Usuario usuario;

    @ManyToOne
    @JoinColumn(
            name = "proyecto_id",
            nullable = false
    )
    private Proyecto proyecto;

    @Column(
            name = "fecha_asignacion",
            nullable = false,
            updatable = false
    )
    private LocalDateTime fechaAsignacion;

    /*
     * Permite retirar temporalmente el acceso sin borrar
     * el historial de asignación.
     */
    @Column(
            nullable = false
    )
    @Builder.Default
    private Boolean estado = true;
}