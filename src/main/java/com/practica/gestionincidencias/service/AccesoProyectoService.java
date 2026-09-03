package com.practica.gestionincidencias.service;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.practica.gestionincidencias.entity.Proyecto;
import com.practica.gestionincidencias.entity.Ticket;
import com.practica.gestionincidencias.entity.Usuario;
import com.practica.gestionincidencias.entity.UsuarioRol;
import com.practica.gestionincidencias.repository.UsuarioProyectoRepository;
import com.practica.gestionincidencias.repository.UsuarioRepository;
import com.practica.gestionincidencias.repository.UsuarioRolRepository;

@Service
public class AccesoProyectoService {

    private final UsuarioRepository usuarioRepository;
    private final UsuarioRolRepository usuarioRolRepository;
    private final UsuarioProyectoRepository usuarioProyectoRepository;

    public AccesoProyectoService(
            UsuarioRepository usuarioRepository,
            UsuarioRolRepository usuarioRolRepository,
            UsuarioProyectoRepository usuarioProyectoRepository) {

        this.usuarioRepository = usuarioRepository;
        this.usuarioRolRepository = usuarioRolRepository;
        this.usuarioProyectoRepository = usuarioProyectoRepository;
    }

    public Usuario obtenerUsuarioAutenticado() {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "No se pudo identificar al usuario autenticado."
            );
        }

        return usuarioRepository
                .findByCorreo(authentication.getName())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "El usuario autenticado no existe."
                        )
                );
    }

    public String obtenerRol(Usuario usuario) {

        if (usuario == null || usuario.getId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "No se pudo identificar el rol del usuario."
            );
        }

        UsuarioRol usuarioRol =
                usuarioRolRepository
                        .findByUsuarioId(usuario.getId())
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.FORBIDDEN,
                                        "El usuario no tiene un rol asignado."
                                )
                        );

        if (usuarioRol.getRol() == null
                || usuarioRol.getRol().getNombre() == null) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "El rol asignado al usuario no es válido."
            );
        }

        return usuarioRol
                .getRol()
                .getNombre()
                .trim()
                .toUpperCase();
    }

    public boolean usuarioTieneAccesoProyecto(
            Integer usuarioId,
            Integer proyectoId) {

        if (usuarioId == null || proyectoId == null) {
            return false;
        }

        return usuarioProyectoRepository
                .existsByUsuarioIdAndProyectoIdAndEstadoTrue(
                        usuarioId,
                        proyectoId
                );
    }

    public void validarProyectoDisponible(Proyecto proyecto) {

        if (proyecto == null) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Proyecto no encontrado."
            );
        }

        if (!Boolean.TRUE.equals(proyecto.getEstado())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "El proyecto se encuentra inactivo."
            );
        }

        if (proyecto.getCompania() == null
                || !Boolean.TRUE.equals(
                        proyecto.getCompania().getEstado()
                )) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "La compañía asociada al proyecto se encuentra inactiva."
            );
        }
    }

    public void validarAccesoProyecto(
            Usuario usuario,
            String rol,
            Proyecto proyecto) {

        if ("ADMIN".equals(rol)) {
            return;
        }

        validarProyectoDisponible(proyecto);

        if (usuario == null || usuario.getId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "No se pudo identificar al usuario."
            );
        }

        if (!usuarioTieneAccesoProyecto(
                usuario.getId(),
                proyecto.getId())) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "No tienes acceso al proyecto seleccionado."
            );
        }
    }

    public void validarAccesoTicket(
            Usuario usuario,
            String rol,
            Ticket ticket) {

        if (ticket == null) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Ticket no encontrado."
            );
        }

        if (usuario == null || usuario.getId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "No se pudo identificar al usuario."
            );
        }

        String rolNormalizado =
                String.valueOf(rol)
                        .trim()
                        .toUpperCase();

        /*
         * ADMIN puede consultar cualquier ticket.
         */
        if ("ADMIN".equals(rolNormalizado)) {
            return;
        }

        /*
         * CLIENTE:
         * un cliente puede consultar cualquier ticket cuyo cliente
         * sea él mismo.
         *
         * Importante: aquí NO volvemos a exigir la asignación activa
         * usuario-proyecto. Esto permite conservar acceso al historial
         * de un ticket propio aunque posteriormente se retire el acceso
         * al proyecto.
         */
        if ("CLIENTE".equals(rolNormalizado)) {

            if (ticket.getCliente() == null
                    || ticket.getCliente().getId() == null
                    || !usuario.getId().equals(
                            ticket.getCliente().getId()
                    )) {

                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "No tienes acceso a este ticket."
                );
            }

            return;
        }

        /*
         * Para SUPERVISOR y AGENTE sí validamos primero
         * que el proyecto y la compañía estén disponibles
         * y que el usuario tenga acceso activo al proyecto.
         */
        Proyecto proyecto =
                ticket.getProyecto();

        validarAccesoProyecto(
                usuario,
                rolNormalizado,
                proyecto
        );

        if ("SUPERVISOR".equals(rolNormalizado)) {
            return;
        }

        if ("AGENTE".equals(rolNormalizado)) {

            if (ticket.getAgenteAsignado() == null
                    || ticket.getAgenteAsignado().getId() == null
                    || !usuario.getId().equals(
                            ticket.getAgenteAsignado().getId()
                    )) {

                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "El ticket no está asignado a este agente."
                );
            }

            return;
        }

        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "El rol del usuario no tiene acceso a tickets."
        );
    }

    public boolean puedeAccederTicket(
            Usuario usuario,
            String rol,
            Ticket ticket) {

        try {

            validarAccesoTicket(
                    usuario,
                    rol,
                    ticket
            );

            return true;

        } catch (ResponseStatusException exception) {

            return false;
        }
    }

    public boolean esRol(
            Usuario usuario,
            String rolEsperado) {

        return obtenerRol(usuario)
                .equals(
                        rolEsperado
                                .trim()
                                .toUpperCase()
                );
    }
}