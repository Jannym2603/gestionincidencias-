package com.practica.gestionincidencias.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "integraciones_aranda",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_integracion_aranda_ticket",
                        columnNames = "ticket_id"
                ),
                @UniqueConstraint(
                        name = "uk_integracion_aranda_item",
                        columnNames = "aranda_item_id"
                )
        }
)
public class IntegracionAranda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "ticket_id",
            nullable = false,
            unique = true
    )
    private Ticket ticket;

    @Column(
            name = "aranda_item_id",
            nullable = false,
            unique = true
    )
    private Long arandaItemId;

    @Column(
            name = "aranda_id_proyecto",
            nullable = false,
            length = 100
    )
    private String arandaIdProyecto;

    @Column(
            name = "estado_sincronizacion",
            nullable = false,
            length = 30
    )
    private String estadoSincronizacion;

    @Column(
            name = "fecha_creacion_aranda",
            nullable = false
    )
    private LocalDateTime fechaCreacionAranda;

    @Column(
            name = "fecha_ultima_sincronizacion"
    )
    private LocalDateTime fechaUltimaSincronizacion;

    @Column(
            name = "ultimo_error",
            columnDefinition = "TEXT"
    )
    private String ultimoError;

    public IntegracionAranda() {
    }

    public IntegracionAranda(
            Long id,
            Ticket ticket,
            Long arandaItemId,
            String arandaIdProyecto,
            String estadoSincronizacion,
            LocalDateTime fechaCreacionAranda,
            LocalDateTime fechaUltimaSincronizacion,
            String ultimoError) {

        this.id = id;
        this.ticket = ticket;
        this.arandaItemId = arandaItemId;
        this.arandaIdProyecto = arandaIdProyecto;
        this.estadoSincronizacion = estadoSincronizacion;
        this.fechaCreacionAranda = fechaCreacionAranda;
        this.fechaUltimaSincronizacion =
                fechaUltimaSincronizacion;
        this.ultimoError = ultimoError;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Ticket getTicket() {
        return ticket;
    }

    public void setTicket(Ticket ticket) {
        this.ticket = ticket;
    }

    public Long getArandaItemId() {
        return arandaItemId;
    }

    public void setArandaItemId(
            Long arandaItemId) {

        this.arandaItemId = arandaItemId;
    }

    public String getArandaIdProyecto() {
        return arandaIdProyecto;
    }

    public void setArandaIdProyecto(
            String arandaIdProyecto) {

        this.arandaIdProyecto =
                arandaIdProyecto;
    }

    public String getEstadoSincronizacion() {
        return estadoSincronizacion;
    }

    public void setEstadoSincronizacion(
            String estadoSincronizacion) {

        this.estadoSincronizacion =
                estadoSincronizacion;
    }

    public LocalDateTime getFechaCreacionAranda() {
        return fechaCreacionAranda;
    }

    public void setFechaCreacionAranda(
            LocalDateTime fechaCreacionAranda) {

        this.fechaCreacionAranda =
                fechaCreacionAranda;
    }

    public LocalDateTime getFechaUltimaSincronizacion() {
        return fechaUltimaSincronizacion;
    }

    public void setFechaUltimaSincronizacion(
            LocalDateTime fechaUltimaSincronizacion) {

        this.fechaUltimaSincronizacion =
                fechaUltimaSincronizacion;
    }

    public String getUltimoError() {
        return ultimoError;
    }

    public void setUltimoError(
            String ultimoError) {

        this.ultimoError = ultimoError;
    }
}