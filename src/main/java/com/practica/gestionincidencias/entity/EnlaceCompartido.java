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
@Table(name = "enlaces_compartidos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnlaceCompartido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @ManyToOne
    @JoinColumn(name = "creado_por", nullable = false)
    private Usuario creadoPor;

    @Column(name = "correo_destinatario", nullable = false, length = 150)
    private String correoDestinatario;

    @Column(nullable = false, unique = true, length = 150)
    private String token;

    @Column(name = "puede_ver", nullable = false)
    private Boolean puedeVer;

    @Column(name = "puede_comentar", nullable = false)
    private Boolean puedeComentar;

    @Column(name = "puede_ver_adjuntos", nullable = false)
    private Boolean puedeVerAdjuntos;

    @Column(name = "puede_subir_adjuntos", nullable = false)
    private Boolean puedeSubirAdjuntos;

    @Column(name = "puede_cambiar_estado", nullable = false)
    private Boolean puedeCambiarEstado;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_expiracion")
    private LocalDateTime fechaExpiracion;

    @Column(nullable = false)
    private Boolean activo;
}