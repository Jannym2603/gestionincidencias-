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
@Table(name = "codigos_recuperacion_password")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CodigoRecuperacionPassword {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(
            nullable = false,
            length = 150
    )
    private String correo;

    /*
     * Aquí ya no se guarda el código de 6 dígitos
     * directamente.
     *
     * Se almacenará su hash BCrypt.
     */
    @Column(
            nullable = false,
            length = 100
    )
    private String codigo;

    @Column(
            nullable = false
    )
    private LocalDateTime fechaCreacion;

    @Column(
            nullable = false
    )
    private LocalDateTime fechaExpiracion;

    @Column(
            nullable = false
    )
    private Boolean usado;

    /*
     * Cantidad de códigos incorrectos introducidos.
     * Después de 5 intentos el código se invalida.
     */
    @Column(
            nullable = false
    )
    @Builder.Default
    private Integer intentosFallidos = 0;
}