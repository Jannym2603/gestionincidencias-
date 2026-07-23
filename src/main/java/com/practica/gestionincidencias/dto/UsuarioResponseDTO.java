package com.practica.gestionincidencias.dto;

import java.time.LocalDateTime;

public class UsuarioResponseDTO {

    private Integer id;
    private String nombre;
    private String apellido;
    private String correo;
    private String telefono;
    private Boolean estado;
    private LocalDateTime fechaCreacion;
    private String rol;

    public UsuarioResponseDTO() {
    }

    public UsuarioResponseDTO(
            Integer id,
            String nombre,
            String apellido,
            String correo,
            String telefono,
            Boolean estado,
            LocalDateTime fechaCreacion,
            String rol) {

        this.id = id;
        this.nombre = nombre;
        this.apellido = apellido;
        this.correo = correo;
        this.telefono = telefono;
        this.estado = estado;
        this.fechaCreacion = fechaCreacion;
        this.rol = rol;
    }

    public Integer getId() {
        return id;
    }

    public String getNombre() {
        return nombre;
    }

    public String getApellido() {
        return apellido;
    }

    public String getCorreo() {
        return correo;
    }

    public String getTelefono() {
        return telefono;
    }

    public Boolean getEstado() {
        return estado;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public String getRol() {
        return rol;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public void setApellido(String apellido) {
        this.apellido = apellido;
    }

    public void setCorreo(String correo) {
        this.correo = correo;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }

    public void setEstado(Boolean estado) {
        this.estado = estado;
    }

    public void setFechaCreacion(
            LocalDateTime fechaCreacion) {

        this.fechaCreacion = fechaCreacion;
    }

    public void setRol(String rol) {
        this.rol = rol;
    }
}