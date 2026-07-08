package com.practica.gestionincidencias.dto;

public class ReporteResumenDTO {

    private long totalTickets;
    private long ticketsNuevos;
    private long ticketsAsignados;
    private long ticketsEnProgreso;
    private long ticketsResueltos;
    private long ticketsCerrados;
    private long totalUsuarios;
    private long totalComentarios;

    public ReporteResumenDTO() {
    }

    public ReporteResumenDTO(long totalTickets, long ticketsNuevos, long ticketsAsignados,
                             long ticketsEnProgreso, long ticketsResueltos, long ticketsCerrados,
                             long totalUsuarios, long totalComentarios) {
        this.totalTickets = totalTickets;
        this.ticketsNuevos = ticketsNuevos;
        this.ticketsAsignados = ticketsAsignados;
        this.ticketsEnProgreso = ticketsEnProgreso;
        this.ticketsResueltos = ticketsResueltos;
        this.ticketsCerrados = ticketsCerrados;
        this.totalUsuarios = totalUsuarios;
        this.totalComentarios = totalComentarios;
    }

    public long getTotalTickets() {
        return totalTickets;
    }

    public long getTicketsNuevos() {
        return ticketsNuevos;
    }

    public long getTicketsAsignados() {
        return ticketsAsignados;
    }

    public long getTicketsEnProgreso() {
        return ticketsEnProgreso;
    }

    public long getTicketsResueltos() {
        return ticketsResueltos;
    }

    public long getTicketsCerrados() {
        return ticketsCerrados;
    }

    public long getTotalUsuarios() {
        return totalUsuarios;
    }

    public long getTotalComentarios() {
        return totalComentarios;
    }
}