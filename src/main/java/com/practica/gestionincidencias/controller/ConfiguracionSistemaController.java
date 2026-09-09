package com.practica.gestionincidencias.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.practica.gestionincidencias.dto.AuditoriaConfiguracionResponseDTO;
import com.practica.gestionincidencias.dto.ConfiguracionSistemaDTO;
import com.practica.gestionincidencias.service.ConfiguracionSistemaService;

@RestController
@RequestMapping("/api/configuracion-sistema")
public class ConfiguracionSistemaController {

    private final ConfiguracionSistemaService service;

    public ConfiguracionSistemaController(
            ConfiguracionSistemaService service) {

        this.service = service;
    }

    /*
     * Obtiene la configuración global del sistema:
     *
     * - Estado global de Crear Ticket
     * - Estado global de Reportes
     * - Estado global de Historial
     * - Permisos por rol de cada módulo
     *
     * Cualquier usuario autenticado puede consultar
     * esta configuración.
     */
    @GetMapping
    public ResponseEntity<ConfiguracionSistemaDTO>
            obtenerConfiguracion() {

        return ResponseEntity.ok(
                service.obtenerConfiguracion()
        );
    }

    /*
     * Actualiza la configuración global
     * y los permisos por rol.
     *
     * Solamente ADMIN puede modificarla.
     */
    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ConfiguracionSistemaDTO>
            actualizarConfiguracion(
                    @RequestBody ConfiguracionSistemaDTO dto) {

        return ResponseEntity.ok(
                service.actualizarConfiguracion(dto)
        );
    }

    /*
     * Devuelve la auditoría de cambios
     * realizados sobre la configuración.
     *
     * Solamente ADMIN puede consultarla.
     */
    @GetMapping("/auditoria")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AuditoriaConfiguracionResponseDTO>>
            obtenerAuditoria() {

        return ResponseEntity.ok(
                service.obtenerAuditoria()
        );
    }
}