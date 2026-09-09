package com.practica.gestionincidencias.service;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import com.practica.gestionincidencias.dto.ConfiguracionSistemaDTO;

@Service("moduloAccesoService")
public class ModuloAccesoService {

    private final ConfiguracionSistemaService configuracionSistemaService;

    public ModuloAccesoService(
            ConfiguracionSistemaService configuracionSistemaService) {

        this.configuracionSistemaService =
                configuracionSistemaService;
    }

    public boolean puedeCrearTicket(
            Authentication authentication) {

        if (!autenticacionValida(authentication)) {
            return false;
        }

        ConfiguracionSistemaDTO config =
                configuracionSistemaService
                        .obtenerConfiguracion();

        if (!Boolean.TRUE.equals(
                config.crearTicketActivo())) {

            return false;
        }

        String rol =
                obtenerRol(authentication);

        return switch (rol) {

            case "ADMIN" ->
                    true;

            case "CLIENTE" ->
                    Boolean.TRUE.equals(
                            config.crearTicketCliente()
                    );

            case "AGENTE" ->
                    Boolean.TRUE.equals(
                            config.crearTicketAgente()
                    );

            case "SUPERVISOR" ->
                    Boolean.TRUE.equals(
                            config.crearTicketSupervisor()
                    );

            default ->
                    false;
        };
    }

    public boolean puedeVerSolicitudesRecursos(
            Authentication authentication) {

        if (!autenticacionValida(authentication)) {
            return false;
        }

        ConfiguracionSistemaDTO config =
                configuracionSistemaService
                        .obtenerConfiguracion();

        if (!Boolean.TRUE.equals(
                config.solicitudesRecursosActivo())) {

            return false;
        }

        String rol =
                obtenerRol(authentication);

        return switch (rol) {

            case "ADMIN" ->
                    true;

            case "CLIENTE" ->
                    Boolean.TRUE.equals(
                            config.solicitudesRecursosCliente()
                    );

            case "AGENTE" ->
                    Boolean.TRUE.equals(
                            config.solicitudesRecursosAgente()
                    );

            case "SUPERVISOR" ->
                    Boolean.TRUE.equals(
                            config.solicitudesRecursosSupervisor()
                    );

            default ->
                    false;
        };
    }

    public boolean puedeAdministrarSolicitudesRecursos(
            Authentication authentication) {

        if (!puedeVerSolicitudesRecursos(authentication)) {
            return false;
        }

        String rol =
                obtenerRol(authentication);

        return "ADMIN".equals(rol)
                || "SUPERVISOR".equals(rol);
    }

    public boolean puedeVerReportes(
            Authentication authentication) {

        if (!autenticacionValida(authentication)) {
            return false;
        }

        ConfiguracionSistemaDTO config =
                configuracionSistemaService
                        .obtenerConfiguracion();

        if (!Boolean.TRUE.equals(
                config.reportesActivos())) {

            return false;
        }

        String rol =
                obtenerRol(authentication);

        return switch (rol) {

            case "ADMIN" ->
                    true;

            case "CLIENTE" ->
                    Boolean.TRUE.equals(
                            config.reportesCliente()
                    );

            case "AGENTE" ->
                    Boolean.TRUE.equals(
                            config.reportesAgente()
                    );

            case "SUPERVISOR" ->
                    Boolean.TRUE.equals(
                            config.reportesSupervisor()
                    );

            default ->
                    false;
        };
    }

    public boolean puedeVerHistorial(
            Authentication authentication) {

        if (!autenticacionValida(authentication)) {
            return false;
        }

        ConfiguracionSistemaDTO config =
                configuracionSistemaService
                        .obtenerConfiguracion();

        if (!Boolean.TRUE.equals(
                config.historialActivo())) {

            return false;
        }

        String rol =
                obtenerRol(authentication);

        return switch (rol) {

            case "ADMIN" ->
                    true;

            case "CLIENTE" ->
                    Boolean.TRUE.equals(
                            config.historialCliente()
                    );

            case "AGENTE" ->
                    Boolean.TRUE.equals(
                            config.historialAgente()
                    );

            case "SUPERVISOR" ->
                    Boolean.TRUE.equals(
                            config.historialSupervisor()
                    );

            default ->
                    false;
        };
    }

    private boolean autenticacionValida(
            Authentication authentication) {

        return authentication != null
                && authentication.isAuthenticated();
    }

    private String obtenerRol(
            Authentication authentication) {

        return authentication
                .getAuthorities()
                .stream()
                .map(authority ->
                        authority.getAuthority()
                )
                .filter(authority ->
                        authority.startsWith("ROLE_")
                )
                .map(authority ->
                        authority.substring(5)
                )
                .findFirst()
                .orElse("");
    }
}
