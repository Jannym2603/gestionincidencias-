package com.practica.gestionincidencias.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.Min;

public class ActualizarSolicitudRecursoRequestDTO {

    private String categoria;
    private String recurso;

    @Min(
            value = 1,
            message = "La cantidad debe ser mayor o igual a 1."
    )
    private Integer cantidad;

    private String proveedor;
    private String estadoRecurso;

    private LocalDateTime fechaSolicitudProveedor;
    private LocalDateTime fechaEstimadaEntrega;
    private LocalDateTime fechaRecepcion;
    private LocalDateTime fechaEntregaCliente;

    private String observaciones;

    public ActualizarSolicitudRecursoRequestDTO() {
    }

    public String getCategoria() {
        return categoria;
    }

    public String getRecurso() {
        return recurso;
    }

    public Integer getCantidad() {
        return cantidad;
    }

    public String getProveedor() {
        return proveedor;
    }

    public String getEstadoRecurso() {
        return estadoRecurso;
    }

    public LocalDateTime getFechaSolicitudProveedor() {
        return fechaSolicitudProveedor;
    }

    public LocalDateTime getFechaEstimadaEntrega() {
        return fechaEstimadaEntrega;
    }

    public LocalDateTime getFechaRecepcion() {
        return fechaRecepcion;
    }

    public LocalDateTime getFechaEntregaCliente() {
        return fechaEntregaCliente;
    }

    public String getObservaciones() {
        return observaciones;
    }

    public void setCategoria(String categoria) {
        this.categoria = categoria;
    }

    public void setRecurso(String recurso) {
        this.recurso = recurso;
    }

    public void setCantidad(Integer cantidad) {
        this.cantidad = cantidad;
    }

    public void setProveedor(String proveedor) {
        this.proveedor = proveedor;
    }

    public void setEstadoRecurso(String estadoRecurso) {
        this.estadoRecurso = estadoRecurso;
    }

    public void setFechaSolicitudProveedor(
            LocalDateTime fechaSolicitudProveedor) {
        this.fechaSolicitudProveedor = fechaSolicitudProveedor;
    }

    public void setFechaEstimadaEntrega(
            LocalDateTime fechaEstimadaEntrega) {
        this.fechaEstimadaEntrega = fechaEstimadaEntrega;
    }

    public void setFechaRecepcion(
            LocalDateTime fechaRecepcion) {
        this.fechaRecepcion = fechaRecepcion;
    }

    public void setFechaEntregaCliente(
            LocalDateTime fechaEntregaCliente) {
        this.fechaEntregaCliente = fechaEntregaCliente;
    }

    public void setObservaciones(String observaciones) {
        this.observaciones = observaciones;
    }
}
