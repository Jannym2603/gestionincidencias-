package com.practica.gestionincidencias.controller;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.practica.gestionincidencias.entity.IntegracionAranda;
import com.practica.gestionincidencias.service.ArandaService;

@RestController
@RequestMapping("/api/aranda")
public class ArandaController {

    private final ArandaService arandaService;

    public ArandaController(
            ArandaService arandaService) {

        this.arandaService = arandaService;
    }

    @PostMapping("/tickets/{ticketId}/enviar")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> enviarTicket(
            @PathVariable Integer ticketId) {

        IntegracionAranda integracion =
                arandaService.enviarTicketAAranda(ticketId);

        return construirRespuesta(integracion);
    }

    @GetMapping("/tickets/{ticketId}")
    public Map<String, Object> consultarIntegracion(
            @PathVariable Integer ticketId) {

        IntegracionAranda integracion =
                arandaService.consultarPorTicket(ticketId);

        return construirRespuesta(integracion);
    }

    private Map<String, Object> construirRespuesta(
            IntegracionAranda integracion) {

        Map<String, Object> respuesta =
                new LinkedHashMap<>();

        respuesta.put(
                "id",
                integracion.getId()
        );

        respuesta.put(
                "ticketId",
                integracion.getTicket().getId()
        );

        respuesta.put(
                "arandaItemId",
                integracion.getArandaItemId()
        );

        respuesta.put(
                "arandaIdProyecto",
                integracion.getArandaIdProyecto()
        );

        respuesta.put(
                "estadoSincronizacion",
                integracion.getEstadoSincronizacion()
        );

        respuesta.put(
                "fechaCreacionAranda",
                integracion.getFechaCreacionAranda()
        );

        respuesta.put(
                "fechaUltimaSincronizacion",
                integracion.getFechaUltimaSincronizacion()
        );

        respuesta.put(
                "ultimoError",
                integracion.getUltimoError()
        );

        respuesta.put(
                "fechaConsulta",
                LocalDateTime.now()
        );

        return respuesta;
    }
}