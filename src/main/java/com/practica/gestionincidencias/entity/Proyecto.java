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
        name = "proyectos",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_proyecto_compania_nombre",
                        columnNames = {
                                "compania_id",
                                "nombre"
                        }
                )
        },
        indexes = {
                @Index(
                        name = "idx_proyecto_compania",
                        columnList = "compania_id"
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Proyecto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(
            name = "compania_id",
            nullable = false
    )
    private Compania compania;

    @Column(
            nullable = false,
            length = 150
    )
    private String nombre;

    @Column(
            columnDefinition = "TEXT"
    )
    private String descripcion;

    @Column(
            nullable = false
    )
    @Builder.Default
    private Boolean estado = true;

    @Column(
            name = "fecha_creacion",
            nullable = false,
            updatable = false
    )
    private LocalDateTime fechaCreacion;

    @Column(
            name = "fecha_actualizacion",
            nullable = false
    )
    private LocalDateTime fechaActualizacion;
}