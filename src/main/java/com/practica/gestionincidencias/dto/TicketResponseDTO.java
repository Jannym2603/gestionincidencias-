package com.practica.gestionincidencias.dto;

import java.time.LocalDateTime;

public class TicketResponseDTO {

    private Integer id;
    private String numeroTicket;
    private String titulo;
    private String descripcion;

    private Integer tipoIncidenciaId;
    private String tipoIncidenciaNombre;

    private Integer clienteId;
    private String clienteNombre;
    private String clienteCorreo;

    private Integer agenteId;
    private String agenteNombre;

    private Integer proyectoId;
    private String proyectoNombre;

    private Integer companiaId;
    private String companiaNombre;

    private String tipoAtencion;

    private String estado;
    private String prioridad;
    private String severidad;
    private String criticidad;
    private String impacto;
    private String urgencia;

    /*
     * ==========================================
     * FECHAS PRINCIPALES
     * ==========================================
     */

    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;

    /*
     * Momento en que el problema fue resuelto.
     * El ticket todavía puede permanecer abierto.
     */
    private LocalDateTime fechaResolucion;

    /*
     * Momento en que el ticket se cerró
     * definitivamente.
     *
     * Esta fecha detendrá el contador
     * de tiempo abierto.
     */
    private LocalDateTime fechaCierre;


    /*
     * ==========================================
     * SLA PRIMERA RESPUESTA
     * ==========================================
     */

    private LocalDateTime fechaLimiteRespuesta;
    private LocalDateTime fechaPrimeraRespuesta;
    private Boolean slaRespuestaCumplido;


    /*
     * ==========================================
     * SLA RESOLUCIÓN
     * ==========================================
     */

    private LocalDateTime fechaLimiteResolucion;
    private Boolean slaResolucionCumplido;


    /*
     * Estados calculados del SLA.
     */
    private String estadoSlaRespuesta;
    private String estadoSlaResolucion;


    public TicketResponseDTO() {
    }


    public TicketResponseDTO(
            Integer id,
            String numeroTicket,
            String titulo,
            String descripcion,

            Integer tipoIncidenciaId,
            String tipoIncidenciaNombre,

            Integer clienteId,
            String clienteNombre,
            String clienteCorreo,

            Integer agenteId,
            String agenteNombre,

            Integer proyectoId,
            String proyectoNombre,

            Integer companiaId,
            String companiaNombre,

            String tipoAtencion,

            String estado,
            String prioridad,
            String severidad,
            String criticidad,
            String impacto,
            String urgencia,

            LocalDateTime fechaCreacion,
            LocalDateTime fechaActualizacion,
            LocalDateTime fechaResolucion,
            LocalDateTime fechaCierre,

            LocalDateTime fechaLimiteRespuesta,
            LocalDateTime fechaPrimeraRespuesta,
            Boolean slaRespuestaCumplido,

            LocalDateTime fechaLimiteResolucion,
            Boolean slaResolucionCumplido,

            String estadoSlaRespuesta,
            String estadoSlaResolucion) {

        this.id = id;
        this.numeroTicket = numeroTicket;
        this.titulo = titulo;
        this.descripcion = descripcion;

        this.tipoIncidenciaId = tipoIncidenciaId;
        this.tipoIncidenciaNombre = tipoIncidenciaNombre;

        this.clienteId = clienteId;
        this.clienteNombre = clienteNombre;
        this.clienteCorreo = clienteCorreo;

        this.agenteId = agenteId;
        this.agenteNombre = agenteNombre;

        this.proyectoId = proyectoId;
        this.proyectoNombre = proyectoNombre;

        this.companiaId = companiaId;
        this.companiaNombre = companiaNombre;

        this.tipoAtencion = tipoAtencion;

        this.estado = estado;
        this.prioridad = prioridad;
        this.severidad = severidad;
        this.criticidad = criticidad;
        this.impacto = impacto;
        this.urgencia = urgencia;

        this.fechaCreacion = fechaCreacion;
        this.fechaActualizacion = fechaActualizacion;
        this.fechaResolucion = fechaResolucion;
        this.fechaCierre = fechaCierre;

        this.fechaLimiteRespuesta = fechaLimiteRespuesta;
        this.fechaPrimeraRespuesta = fechaPrimeraRespuesta;
        this.slaRespuestaCumplido = slaRespuestaCumplido;

        this.fechaLimiteResolucion = fechaLimiteResolucion;
        this.slaResolucionCumplido = slaResolucionCumplido;

        this.estadoSlaRespuesta = estadoSlaRespuesta;
        this.estadoSlaResolucion = estadoSlaResolucion;
    }


    public Integer getId() {
        return id;
    }

    public String getNumeroTicket() {
        return numeroTicket;
    }

    public String getTitulo() {
        return titulo;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public Integer getTipoIncidenciaId() {
        return tipoIncidenciaId;
    }

    public String getTipoIncidenciaNombre() {
        return tipoIncidenciaNombre;
    }

    public Integer getClienteId() {
        return clienteId;
    }

    public String getClienteNombre() {
        return clienteNombre;
    }

    public String getClienteCorreo() {
        return clienteCorreo;
    }

    public Integer getAgenteId() {
        return agenteId;
    }

    public String getAgenteNombre() {
        return agenteNombre;
    }

    public Integer getProyectoId() {
        return proyectoId;
    }

    public String getProyectoNombre() {
        return proyectoNombre;
    }

    public Integer getCompaniaId() {
        return companiaId;
    }

    public String getCompaniaNombre() {
        return companiaNombre;
    }

    public String getTipoAtencion() {
        return tipoAtencion;
    }

    public String getEstado() {
        return estado;
    }

    public String getPrioridad() {
        return prioridad;
    }

    public String getSeveridad() {
        return severidad;
    }

    public String getCriticidad() {
        return criticidad;
    }

    public String getImpacto() {
        return impacto;
    }

    public String getUrgencia() {
        return urgencia;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public LocalDateTime getFechaActualizacion() {
        return fechaActualizacion;
    }

    public LocalDateTime getFechaResolucion() {
        return fechaResolucion;
    }

    public LocalDateTime getFechaCierre() {
        return fechaCierre;
    }

    public LocalDateTime getFechaLimiteRespuesta() {
        return fechaLimiteRespuesta;
    }

    public LocalDateTime getFechaPrimeraRespuesta() {
        return fechaPrimeraRespuesta;
    }

    public Boolean getSlaRespuestaCumplido() {
        return slaRespuestaCumplido;
    }

    public LocalDateTime getFechaLimiteResolucion() {
        return fechaLimiteResolucion;
    }

    public Boolean getSlaResolucionCumplido() {
        return slaResolucionCumplido;
    }

    public String getEstadoSlaRespuesta() {
        return estadoSlaRespuesta;
    }

    public String getEstadoSlaResolucion() {
        return estadoSlaResolucion;
    }
}