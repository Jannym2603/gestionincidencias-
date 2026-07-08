package com.practica.gestionincidencias.dto;

public class ConteoDTO {

    private String nombre;
    private long total;

    public ConteoDTO() {
    }

    public ConteoDTO(String nombre, long total) {
        this.nombre = nombre;
        this.total = total;
    }

    public String getNombre() {
        return nombre;
    }

    public long getTotal() {
        return total;
    }
}