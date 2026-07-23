package com.practica.gestionincidencias.controller;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.practica.gestionincidencias.dto.UsuarioRegistroRequestDTO;
import com.practica.gestionincidencias.dto.UsuarioResponseDTO;
import com.practica.gestionincidencias.entity.Rol;
import com.practica.gestionincidencias.entity.Usuario;
import com.practica.gestionincidencias.entity.UsuarioRol;
import com.practica.gestionincidencias.repository.RolRepository;
import com.practica.gestionincidencias.repository.UsuarioRepository;
import com.practica.gestionincidencias.repository.UsuarioRolRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final UsuarioRolRepository usuarioRolRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioController(
            UsuarioRepository usuarioRepository,
            RolRepository rolRepository,
            UsuarioRolRepository usuarioRolRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.usuarioRolRepository = usuarioRolRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public List<UsuarioResponseDTO> listarUsuarios() {
        return usuarioRepository.findAll()
                .stream()
                .map(this::convertirADTO)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioResponseDTO registrarUsuario(@Valid @RequestBody UsuarioRegistroRequestDTO request) {

        String correoNormalizado = request.getCorreo().trim().toLowerCase();
        String rolNormalizado = request.getRol().trim().toUpperCase();

        if (usuarioRepository.existsByCorreo(correoNormalizado)) {
            throw new RuntimeException("Ya existe un usuario con ese correo.");
        }

        if (!rolNormalizado.equals("CLIENTE")
                && !rolNormalizado.equals("AGENTE")
                && !rolNormalizado.equals("SUPERVISOR")
                && !rolNormalizado.equals("ADMIN")) {
            throw new RuntimeException("Solo se pueden registrar roles CLIENTE, AGENTE, SUPERVISOR o ADMIN.");
        }

        Rol rol = rolRepository.findByNombre(rolNormalizado)
                .orElseThrow(() -> new RuntimeException("Rol no encontrado en la base de datos."));

        Usuario usuario = Usuario.builder()
                .nombre(request.getNombre().trim())
                .apellido(request.getApellido().trim())
                .correo(correoNormalizado)
                .telefono(request.getTelefono())
                .password(passwordEncoder.encode(request.getPassword().trim()))
                .estado(true)
                .fechaCreacion(LocalDateTime.now())
                .build();

        Usuario usuarioGuardado = usuarioRepository.save(usuario);

        UsuarioRol usuarioRol = UsuarioRol.builder()
                .usuario(usuarioGuardado)
                .rol(rol)
                .build();

        usuarioRolRepository.save(usuarioRol);

        return convertirADTO(usuarioGuardado);
    }

private UsuarioResponseDTO convertirADTO(
        Usuario usuario) {

    String nombreRol =
            usuarioRolRepository
                    .findByUsuarioId(usuario.getId())
                    .map(usuarioRol ->
                            usuarioRol
                                    .getRol()
                                    .getNombre()
                    )
                    .orElse(null);

    return new UsuarioResponseDTO(
            usuario.getId(),
            usuario.getNombre(),
            usuario.getApellido(),
            usuario.getCorreo(),
            usuario.getTelefono(),
            usuario.getEstado(),
            usuario.getFechaCreacion(),
            nombreRol
    );
}

}