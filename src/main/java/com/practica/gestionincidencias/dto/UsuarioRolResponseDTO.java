package com.practica.gestionincidencias.dto;

public class UsuarioRolResponseDTO {

    private Integer id;
    private Integer usuarioId;
    private String nombreUsuario;
    private String correoUsuario;
    private Integer rolId;
    private String nombreRol;

    public UsuarioRolResponseDTO() {
    }

    public UsuarioRolResponseDTO(Integer id, Integer usuarioId, String nombreUsuario,
                                 String correoUsuario, Integer rolId, String nombreRol) {
        this.id = id;
        this.usuarioId = usuarioId;
        this.nombreUsuario = nombreUsuario;
        this.correoUsuario = correoUsuario;
        this.rolId = rolId;
        this.nombreRol = nombreRol;
    }

    public Integer getId() {
        return id;
    }

    public Integer getUsuarioId() {
        return usuarioId;
    }

    public String getNombreUsuario() {
        return nombreUsuario;
    }

    public String getCorreoUsuario() {
        return correoUsuario;
    }

    public Integer getRolId() {
        return rolId;
    }

    public String getNombreRol() {
        return nombreRol;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public void setUsuarioId(Integer usuarioId) {
        this.usuarioId = usuarioId;
    }

    public void setNombreUsuario(String nombreUsuario) {
        this.nombreUsuario = nombreUsuario;
    }

    public void setCorreoUsuario(String correoUsuario) {
        this.correoUsuario = correoUsuario;
    }

    public void setRolId(Integer rolId) {
        this.rolId = rolId;
    }

    public void setNombreRol(String nombreRol) {
        this.nombreRol = nombreRol;
    }
}