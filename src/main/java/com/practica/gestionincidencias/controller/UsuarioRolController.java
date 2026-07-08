package com.practica.gestionincidencias.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.practica.gestionincidencias.dto.UsuarioRolResponseDTO;
import com.practica.gestionincidencias.entity.UsuarioRol;
import com.practica.gestionincidencias.repository.UsuarioRolRepository;

@RestController
@RequestMapping("/api/usuario-roles")
public class UsuarioRolController {

    private final UsuarioRolRepository usuarioRolRepository;

    public UsuarioRolController(UsuarioRolRepository usuarioRolRepository) {
        this.usuarioRolRepository = usuarioRolRepository;
    }

    @GetMapping
    public List<UsuarioRolResponseDTO> listarUsuarioRoles() {
        return usuarioRolRepository.findAll()
                .stream()
                .map(this::convertirADTO)
                .toList();
    }

    private UsuarioRolResponseDTO convertirADTO(UsuarioRol usuarioRol) {
        String nombreCompleto = usuarioRol.getUsuario().getNombre() + " " + usuarioRol.getUsuario().getApellido();

        return new UsuarioRolResponseDTO(
                usuarioRol.getId(),
                usuarioRol.getUsuario().getId(),
                nombreCompleto,
                usuarioRol.getUsuario().getCorreo(),
                usuarioRol.getRol().getId(),
                usuarioRol.getRol().getNombre()
        );
    }
}