package com.practica.gestionincidencias.controller;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.practica.gestionincidencias.dto.UsuarioRegistroRequestDTO;
import com.practica.gestionincidencias.entity.Rol;
import com.practica.gestionincidencias.entity.Usuario;
import com.practica.gestionincidencias.entity.UsuarioRol;
import com.practica.gestionincidencias.repository.RolRepository;
import com.practica.gestionincidencias.repository.UsuarioRepository;
import com.practica.gestionincidencias.repository.UsuarioRolRepository;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final UsuarioRolRepository usuarioRolRepository;

    public UsuarioController(
            UsuarioRepository usuarioRepository,
            RolRepository rolRepository,
            UsuarioRolRepository usuarioRolRepository
    ) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.usuarioRolRepository = usuarioRolRepository;
    }

    /*
     * Devuelve únicamente los datos del usuario autenticado.
     *
     * Este endpoint permite que CLIENTE, AGENTE, SUPERVISOR y ADMIN
     * consulten su propio perfil sin descargar el listado completo
     * de usuarios del sistema.
     */
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> obtenerMiPerfil() {

        Authentication authentication =
                obtenerAuthentication();

        String correoAutenticado =
                authentication.getName();

        if (
                correoAutenticado == null
                        ||
                        correoAutenticado.isBlank()
        ) {
            throw new RuntimeException(
                    "No se pudo identificar al usuario autenticado."
            );
        }

        Usuario usuario =
                usuarioRepository
                        .findByCorreo(
                                correoAutenticado
                                        .trim()
                                        .toLowerCase()
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Usuario autenticado no encontrado."
                                )
                        );

        return convertirARespuesta(
                usuario
        );
    }


    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public List<Map<String, Object>> listarUsuarios() {

        return usuarioRepository
                .findAll()
                .stream()
                .map(this::convertirARespuesta)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public Map<String, Object> registrarUsuario(
            @RequestBody UsuarioRegistroRequestDTO request) {

        validarDatosRegistro(request);

        String correoNormalizado =
                request.getCorreo()
                        .trim()
                        .toLowerCase();

        String rolNormalizado =
                request.getRol()
                        .trim()
                        .toUpperCase();

        validarRolQuePuedeGestionar(
                rolNormalizado
        );

        if (
                usuarioRepository
                        .existsByCorreo(
                                correoNormalizado
                        )
        ) {
            throw new RuntimeException(
                    "Ya existe un usuario con ese correo."
            );
        }

        Rol rol =
                rolRepository
                        .findByNombre(
                                rolNormalizado
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Rol no encontrado en la base de datos."
                                )
                        );

        Usuario usuario =
                Usuario.builder()
                        .nombre(
                                request
                                        .getNombre()
                                        .trim()
                        )
                        .apellido(
                                request
                                        .getApellido()
                                        .trim()
                        )
                        .correo(
                                correoNormalizado
                        )
                        .telefono(
                                normalizarOpcional(
                                        request.getTelefono()
                                )
                        )
                        .password(
                                request.getPassword()
                        )
                        .estado(true)
                        .fechaCreacion(
                                LocalDateTime.now()
                        )
                        .build();

        Usuario usuarioGuardado =
                usuarioRepository
                        .save(usuario);

        UsuarioRol usuarioRol =
                UsuarioRol.builder()
                        .usuario(
                                usuarioGuardado
                        )
                        .rol(rol)
                        .build();

        usuarioRolRepository
                .save(usuarioRol);

        return convertirARespuesta(
                usuarioGuardado
        );
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public Map<String, Object> actualizarUsuario(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> request) {

        Usuario usuario =
                obtenerUsuario(id);

        UsuarioRol usuarioRol =
                obtenerUsuarioRol(id);

        validarPuedeModificarUsuario(
                usuarioRol.getRol().getNombre()
        );

        String nombre =
                obtenerTextoObligatorio(
                        request,
                        "nombre",
                        "El nombre es obligatorio."
                );

        String apellido =
                obtenerTextoObligatorio(
                        request,
                        "apellido",
                        "El apellido es obligatorio."
                );

        String correo =
                obtenerTextoObligatorio(
                        request,
                        "correo",
                        "El correo es obligatorio."
                )
                        .toLowerCase();

        String rolNuevo =
                obtenerTextoObligatorio(
                        request,
                        "rol",
                        "El rol es obligatorio."
                )
                        .toUpperCase();

        validarRolQuePuedeGestionar(
                rolNuevo
        );

        usuarioRepository
                .findByCorreo(correo)
                .ifPresent(usuarioCorreo -> {
                    if (
                            !usuarioCorreo
                                    .getId()
                                    .equals(id)
                    ) {
                        throw new RuntimeException(
                                "Ya existe un usuario con ese correo."
                        );
                    }
                });

        Rol rol =
                rolRepository
                        .findByNombre(
                                rolNuevo
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Rol no encontrado en la base de datos."
                                )
                        );

        usuario.setNombre(
                nombre
        );

        usuario.setApellido(
                apellido
        );

        usuario.setCorreo(
                correo
        );

        usuario.setTelefono(
                normalizarOpcional(
                        valorComoTexto(
                                request.get("telefono")
                        )
                )
        );

        String password =
                valorComoTexto(
                        request.get("password")
                );

        if (
                password != null
                        && !password.isBlank()
        ) {
            if (
                    password.length() < 6
            ) {
                throw new RuntimeException(
                        "La contraseña debe tener al menos 6 caracteres."
                );
            }

            usuario.setPassword(
                    password
            );
        }

        Usuario actualizado =
                usuarioRepository
                        .save(usuario);

        usuarioRol.setRol(
                rol
        );

        usuarioRolRepository
                .save(usuarioRol);

        return convertirARespuesta(
                actualizado
        );
    }

    @PutMapping("/{id}/estado")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public Map<String, Object> cambiarEstadoUsuario(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> request) {

        Usuario usuario =
                obtenerUsuario(id);

        UsuarioRol usuarioRol =
                obtenerUsuarioRol(id);

        validarPuedeModificarUsuario(
                usuarioRol.getRol().getNombre()
        );

        Object valorEstado =
                request.get("estado");

        if (
                !(valorEstado instanceof Boolean)
        ) {
            throw new RuntimeException(
                    "El estado es obligatorio."
            );
        }

        boolean nuevoEstado =
                (Boolean) valorEstado;

        if (
                !nuevoEstado
                        &&
                        esUsuarioAutenticado(usuario)
        ) {
            throw new RuntimeException(
                    "No puedes desactivar tu propia cuenta."
            );
        }

        usuario.setEstado(
                nuevoEstado
        );

        Usuario actualizado =
                usuarioRepository
                        .save(usuario);

        return convertirARespuesta(
                actualizado
        );
    }

    private void validarDatosRegistro(
            UsuarioRegistroRequestDTO request) {

        if (
                request.getNombre() == null
                        ||
                        request.getNombre().isBlank()
        ) {
            throw new RuntimeException(
                    "El nombre es obligatorio."
            );
        }

        if (
                request.getApellido() == null
                        ||
                        request.getApellido().isBlank()
        ) {
            throw new RuntimeException(
                    "El apellido es obligatorio."
            );
        }

        if (
                request.getCorreo() == null
                        ||
                        request.getCorreo().isBlank()
        ) {
            throw new RuntimeException(
                    "El correo es obligatorio."
            );
        }

        if (
                request.getPassword() == null
                        ||
                        request.getPassword().isBlank()
        ) {
            throw new RuntimeException(
                    "La contraseña es obligatoria."
            );
        }

        if (
                request.getPassword().length() < 6
        ) {
            throw new RuntimeException(
                    "La contraseña debe tener al menos 6 caracteres."
            );
        }

        if (
                request.getRol() == null
                        ||
                        request.getRol().isBlank()
        ) {
            throw new RuntimeException(
                    "El rol es obligatorio."
            );
        }
    }

    private void validarRolQuePuedeGestionar(
            String rolObjetivo) {

        Authentication authentication =
                obtenerAuthentication();

        boolean admin =
                authentication
                        .getAuthorities()
                        .stream()
                        .anyMatch(authority ->
                                "ROLE_ADMIN".equals(
                                        authority.getAuthority()
                                )
                        );

        if (admin) {
            if (
                    !rolObjetivo.equals("CLIENTE")
                            &&
                            !rolObjetivo.equals("AGENTE")
                            &&
                            !rolObjetivo.equals("SUPERVISOR")
                            &&
                            !rolObjetivo.equals("ADMIN")
            ) {
                throw new RuntimeException(
                        "Rol no válido."
                );
            }

            return;
        }

        if (
                !rolObjetivo.equals("CLIENTE")
                        &&
                        !rolObjetivo.equals("AGENTE")
        ) {
            throw new RuntimeException(
                    "El SUPERVISOR solo puede crear o asignar roles CLIENTE y AGENTE."
            );
        }
    }

    private void validarPuedeModificarUsuario(
            String rolObjetivoActual) {

        Authentication authentication =
                obtenerAuthentication();

        boolean admin =
                authentication
                        .getAuthorities()
                        .stream()
                        .anyMatch(authority ->
                                "ROLE_ADMIN".equals(
                                        authority.getAuthority()
                                )
                        );

        if (admin) {
            return;
        }

        String rol =
                rolObjetivoActual == null
                        ? ""
                        : rolObjetivoActual
                                .trim()
                                .toUpperCase();

        if (
                !rol.equals("CLIENTE")
                        &&
                        !rol.equals("AGENTE")
        ) {
            throw new RuntimeException(
                    "El SUPERVISOR solo puede administrar usuarios CLIENTE y AGENTE."
            );
        }
    }

    private Usuario obtenerUsuario(
            Integer id) {

        return usuarioRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Usuario no encontrado."
                        )
                );
    }

    private UsuarioRol obtenerUsuarioRol(
            Integer usuarioId) {

        return usuarioRolRepository
                .findByUsuarioId(
                        usuarioId
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "El usuario no tiene rol asignado."
                        )
                );
    }

    private Map<String, Object> convertirARespuesta(
            Usuario usuario) {

        UsuarioRol usuarioRol =
                obtenerUsuarioRol(
                        usuario.getId()
                );

        Map<String, Object> respuesta =
                new LinkedHashMap<>();

        respuesta.put(
                "id",
                usuario.getId()
        );

        respuesta.put(
                "nombre",
                usuario.getNombre()
        );

        respuesta.put(
                "apellido",
                usuario.getApellido()
        );

        respuesta.put(
                "correo",
                usuario.getCorreo()
        );

        respuesta.put(
                "telefono",
                usuario.getTelefono()
        );

        respuesta.put(
                "rol",
                usuarioRol
                        .getRol()
                        .getNombre()
        );

        respuesta.put(
                "estado",
                usuario.getEstado()
        );

        respuesta.put(
                "fechaCreacion",
                usuario.getFechaCreacion()
        );

        return respuesta;
    }

    private boolean esUsuarioAutenticado(
            Usuario usuario) {

        Authentication authentication =
                obtenerAuthentication();

        String correoAutenticado =
                authentication
                        .getName();

        return (
                correoAutenticado != null
                        &&
                        usuario.getCorreo() != null
                        &&
                        usuario.getCorreo()
                                .equalsIgnoreCase(
                                        correoAutenticado
                                )
        );
    }

    private Authentication obtenerAuthentication() {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (
                authentication == null
                        ||
                        !authentication.isAuthenticated()
        ) {
            throw new RuntimeException(
                    "No se pudo identificar al usuario autenticado."
            );
        }

        return authentication;
    }

    private String obtenerTextoObligatorio(
            Map<String, Object> request,
            String campo,
            String mensaje) {

        String valor =
                valorComoTexto(
                        request.get(campo)
                );

        if (
                valor == null
                        ||
                        valor.isBlank()
        ) {
            throw new RuntimeException(
                    mensaje
            );
        }

        return valor.trim();
    }

    private String valorComoTexto(
            Object valor) {

        if (valor == null) {
            return null;
        }

        return String.valueOf(
                valor
        );
    }

    private String normalizarOpcional(
            String valor) {

        if (
                valor == null
                        ||
                        valor.isBlank()
        ) {
            return null;
        }

        return valor.trim();
    }
}