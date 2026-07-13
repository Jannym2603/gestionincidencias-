package com.practica.gestionincidencias.controller;

import java.security.SecureRandom;
import java.time.LocalDateTime;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.practica.gestionincidencias.dto.CambiarPasswordRequestDTO;
import com.practica.gestionincidencias.dto.ConfirmarRecuperacionPasswordRequestDTO;
import com.practica.gestionincidencias.dto.LoginRequestDTO;
import com.practica.gestionincidencias.dto.LoginResponseDTO;
import com.practica.gestionincidencias.dto.SolicitarRecuperacionPasswordRequestDTO;
import com.practica.gestionincidencias.entity.CodigoRecuperacionPassword;
import com.practica.gestionincidencias.entity.Usuario;
import com.practica.gestionincidencias.entity.UsuarioRol;
import com.practica.gestionincidencias.repository.CodigoRecuperacionPasswordRepository;
import com.practica.gestionincidencias.repository.UsuarioRepository;
import com.practica.gestionincidencias.repository.UsuarioRolRepository;
import com.practica.gestionincidencias.security.JwtService;
import com.practica.gestionincidencias.service.NotificacionService;

import jakarta.transaction.Transactional;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UsuarioRepository usuarioRepository;
    private final UsuarioRolRepository usuarioRolRepository;
    private final CodigoRecuperacionPasswordRepository codigoRecuperacionPasswordRepository;
    private final NotificacionService notificacionService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(
            UsuarioRepository usuarioRepository,
            UsuarioRolRepository usuarioRolRepository,
            CodigoRecuperacionPasswordRepository codigoRecuperacionPasswordRepository,
            NotificacionService notificacionService,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.usuarioRepository = usuarioRepository;
        this.usuarioRolRepository = usuarioRolRepository;
        this.codigoRecuperacionPasswordRepository = codigoRecuperacionPasswordRepository;
        this.notificacionService = notificacionService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public LoginResponseDTO login(@Valid @RequestBody LoginRequestDTO request) {

        String correoNormalizado = request.getCorreo().trim().toLowerCase();
        String passwordIngresada = request.getPassword().trim();

        Usuario usuario = usuarioRepository.findByCorreo(correoNormalizado)
                .orElseThrow(() -> new RuntimeException("Correo no registrado."));

        if (usuario.getEstado() == null || !usuario.getEstado()) {
            throw new RuntimeException("Este usuario esta inactivo.");
        }

        if (!passwordValida(usuario, passwordIngresada)) {
            throw new RuntimeException("Contrasena incorrecta.");
        }

        UsuarioRol usuarioRol = usuarioRolRepository.findByUsuarioId(usuario.getId())
                .orElseThrow(() -> new RuntimeException("El usuario no tiene rol asignado."));

        String nombreCompleto = usuario.getNombre() + " " + usuario.getApellido();
        String rol = usuarioRol.getRol().getNombre();

        String token = jwtService.generarToken(
                usuario.getId(),
                usuario.getCorreo(),
                rol
        );

        return new LoginResponseDTO(
                usuario.getId(),
                nombreCompleto,
                usuario.getCorreo(),
                rol,
                token
        );
    }

    @PostMapping("/cambiar-password")
    public String cambiarPassword(@Valid @RequestBody CambiarPasswordRequestDTO request) {

        String correoNormalizado = request.getCorreo().trim().toLowerCase();

        Usuario usuario = usuarioRepository.findByCorreo(correoNormalizado)
                .orElseThrow(() -> new RuntimeException("Correo no registrado."));

        if (usuario.getEstado() == null || !usuario.getEstado()) {
            throw new RuntimeException("Este usuario esta inactivo.");
        }

        usuario.setPassword(passwordEncoder.encode(request.getNuevaPassword().trim()));
        usuarioRepository.save(usuario);

        return "Contrasena actualizada correctamente.";
    }

    @PostMapping("/solicitar-recuperacion")
    @Transactional
    public String solicitarRecuperacionPassword(
            @Valid @RequestBody SolicitarRecuperacionPasswordRequestDTO request) {

        String correoNormalizado = request.getCorreo().trim().toLowerCase();

        Usuario usuario = usuarioRepository.findByCorreo(correoNormalizado)
                .orElseThrow(() -> new RuntimeException("Correo no registrado."));

        if (usuario.getEstado() == null || !usuario.getEstado()) {
            throw new RuntimeException("Este usuario esta inactivo.");
        }

        codigoRecuperacionPasswordRepository.deleteByCorreo(correoNormalizado);

        String codigo = generarCodigoRecuperacion();
        LocalDateTime ahora = LocalDateTime.now();

        CodigoRecuperacionPassword codigoRecuperacion = CodigoRecuperacionPassword.builder()
                .correo(correoNormalizado)
                .codigo(codigo)
                .fechaCreacion(ahora)
                .fechaExpiracion(ahora.plusMinutes(10))
                .usado(false)
                .build();

        codigoRecuperacionPasswordRepository.save(codigoRecuperacion);
        notificacionService.notificarCodigoRecuperacionPassword(usuario, codigo);

        return "Codigo de recuperacion enviado al correo registrado.";
    }

    @PostMapping("/confirmar-recuperacion")
    @Transactional
    public String confirmarRecuperacionPassword(
            @Valid @RequestBody ConfirmarRecuperacionPasswordRequestDTO request) {

        String correoNormalizado = request.getCorreo().trim().toLowerCase();
        String codigoIngresado = request.getCodigo().trim();

        Usuario usuario = usuarioRepository.findByCorreo(correoNormalizado)
                .orElseThrow(() -> new RuntimeException("Correo no registrado."));

        if (usuario.getEstado() == null || !usuario.getEstado()) {
            throw new RuntimeException("Este usuario esta inactivo.");
        }

        CodigoRecuperacionPassword codigoRecuperacion = codigoRecuperacionPasswordRepository
                .findTopByCorreoAndUsadoFalseOrderByFechaCreacionDesc(correoNormalizado)
                .orElseThrow(() -> new RuntimeException("No hay un codigo activo para este correo."));

        if (codigoRecuperacion.getFechaExpiracion().isBefore(LocalDateTime.now())) {
            codigoRecuperacion.setUsado(true);
            codigoRecuperacionPasswordRepository.save(codigoRecuperacion);
            throw new RuntimeException("El codigo de recuperacion expiro. Solicita uno nuevo.");
        }

        if (!codigoRecuperacion.getCodigo().equals(codigoIngresado)) {
            throw new RuntimeException("El codigo de recuperacion no es valido.");
        }

        usuario.setPassword(passwordEncoder.encode(request.getNuevaPassword().trim()));
        usuarioRepository.save(usuario);

        codigoRecuperacion.setUsado(true);
        codigoRecuperacionPasswordRepository.save(codigoRecuperacion);

        return "Contrasena actualizada correctamente.";
    }

    private boolean passwordValida(Usuario usuario, String passwordIngresada) {

        String passwordGuardada = usuario.getPassword();

        if (passwordGuardada == null || passwordGuardada.isBlank()) {
            return false;
        }

        if (passwordGuardada.startsWith("$2a$")
                || passwordGuardada.startsWith("$2b$")
                || passwordGuardada.startsWith("$2y$")) {

            return passwordEncoder.matches(
                    passwordIngresada,
                    passwordGuardada
            );
        }

        if (!passwordGuardada.equals(passwordIngresada)) {
            return false;
        }

        usuario.setPassword(
                passwordEncoder.encode(passwordIngresada)
        );

        usuarioRepository.save(usuario);

        return true;
    }

    private String generarCodigoRecuperacion() {

        return String.format(
                "%06d",
                SECURE_RANDOM.nextInt(1_000_000)
        );
    }
}