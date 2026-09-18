package com.practica.gestionincidencias.controller;

import java.security.SecureRandom;
import java.time.LocalDateTime;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

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

    private static final int MAX_INTENTOS_RECUPERACION = 5;
    private static final int MINUTOS_EXPIRACION_CODIGO = 10;

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

    // =========================================================
    // LOGIN
    // =========================================================

    @PostMapping("/login")
    public LoginResponseDTO login(
            @Valid @RequestBody LoginRequestDTO request) {

        String correoNormalizado = request.getCorreo()
                .trim()
                .toLowerCase();

        String passwordIngresada = request.getPassword()
                .trim();

        Usuario usuario = usuarioRepository
                .findByCorreo(correoNormalizado)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Correo no registrado."
                        )
                );

        if (usuario.getEstado() == null
                || !usuario.getEstado()) {

            throw new RuntimeException(
                    "Este usuario esta inactivo."
            );
        }

        if (!passwordValida(
                usuario,
                passwordIngresada
        )) {

            throw new RuntimeException(
                    "Contrasena incorrecta."
            );
        }

        UsuarioRol usuarioRol =
                usuarioRolRepository
                        .findByUsuarioId(usuario.getId())
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "El usuario no tiene rol asignado."
                                )
                        );

        String nombreCompleto =
                usuario.getNombre()
                        + " "
                        + usuario.getApellido();

        String rol =
                usuarioRol
                        .getRol()
                        .getNombre();

        String token =
                jwtService.generarToken(
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


    // =========================================================
    // CAMBIAR CONTRASEÑA DEL USUARIO AUTENTICADO
    // =========================================================

    @PostMapping("/cambiar-password")
    public String cambiarPassword(
            @Valid @RequestBody CambiarPasswordRequestDTO request,
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Debes iniciar sesión para cambiar tu contraseña."
            );
        }

        String correoAutenticado =
                authentication
                        .getName()
                        .trim()
                        .toLowerCase();

        Usuario usuario =
                usuarioRepository
                        .findByCorreo(correoAutenticado)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.UNAUTHORIZED,
                                        "El usuario autenticado no existe."
                                )
                        );

        if (usuario.getEstado() == null
                || !usuario.getEstado()) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Este usuario esta inactivo."
            );
        }

        String passwordActual =
                request.getPasswordActual()
                        .trim();

        String nuevaPassword =
                request.getNuevaPassword()
                        .trim();

        if (!passwordValida(
                usuario,
                passwordActual
        )) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La contraseña actual es incorrecta."
            );
        }

        validarNuevaPassword(nuevaPassword);

        if (passwordEncoder.matches(
                nuevaPassword,
                usuario.getPassword()
        )) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La nueva contraseña debe ser diferente a la actual."
            );
        }

        usuario.setPassword(
                passwordEncoder.encode(
                        nuevaPassword
                )
        );

        usuarioRepository.save(usuario);

        return "Contrasena actualizada correctamente.";
    }


    // =========================================================
    // SOLICITAR RECUPERACIÓN DE CONTRASEÑA
    // =========================================================

    @PostMapping("/solicitar-recuperacion")
    @Transactional
    public String solicitarRecuperacionPassword(
            @Valid @RequestBody
            SolicitarRecuperacionPasswordRequestDTO request) {

        String correoNormalizado =
                request.getCorreo()
                        .trim()
                        .toLowerCase();

        /*
         * No revelamos si el correo existe o no.
         *
         * Esto evita que alguien pueda utilizar este endpoint
         * para descubrir qué correos están registrados.
         */
        Usuario usuario =
                usuarioRepository
                        .findByCorreo(correoNormalizado)
                        .orElse(null);

        if (usuario == null
                || usuario.getEstado() == null
                || !usuario.getEstado()) {

            return "Si el correo esta registrado, recibiras un codigo de recuperacion.";
        }

        /*
         * Eliminamos códigos anteriores.
         *
         * De esta forma solo puede existir un proceso
         * de recuperación activo para ese correo.
         */
        codigoRecuperacionPasswordRepository
                .deleteByCorreo(
                        correoNormalizado
                );

        String codigo =
                generarCodigoRecuperacion();

        LocalDateTime ahora =
                LocalDateTime.now();

        CodigoRecuperacionPassword codigoRecuperacion =
                CodigoRecuperacionPassword
                        .builder()

                        .correo(
                                correoNormalizado
                        )

                        /*
                         * El código nunca se guarda directamente.
                         *
                         * PostgreSQL recibirá únicamente el hash BCrypt.
                         */
                        .codigo(
                                passwordEncoder.encode(
                                        codigo
                                )
                        )

                        .fechaCreacion(
                                ahora
                        )

                        .fechaExpiracion(
                                ahora.plusMinutes(
                                        MINUTOS_EXPIRACION_CODIGO
                                )
                        )

                        .usado(false)

                        .intentosFallidos(0)

                        .build();

        codigoRecuperacionPasswordRepository
                .save(
                        codigoRecuperacion
                );

        /*
         * El usuario recibe el código original.
         *
         * Únicamente la versión BCrypt permanece
         * almacenada en la base de datos.
         */
        notificacionService
                .notificarCodigoRecuperacionPassword(
                        usuario,
                        codigo
                );

        return "Si el correo esta registrado, recibiras un codigo de recuperacion.";
    }


    // =========================================================
    // CONFIRMAR RECUPERACIÓN DE CONTRASEÑA
    // =========================================================

    /*
     * IMPORTANTE:
     *
     * Este método NO lleva @Transactional.
     *
     * Cuando el usuario escribe un código incorrecto,
     * guardamos el intento fallido y después lanzamos
     * una excepción.
     *
     * Si este método fuera transactional,
     * esa excepción podría provocar rollback y
     * perderíamos el contador de intentos.
     */
    @PostMapping("/confirmar-recuperacion")
    public String confirmarRecuperacionPassword(
            @Valid @RequestBody
            ConfirmarRecuperacionPasswordRequestDTO request) {

        String correoNormalizado =
                request.getCorreo()
                        .trim()
                        .toLowerCase();

        String codigoIngresado =
                request.getCodigo()
                        .trim();

        String nuevaPassword =
                request.getNuevaPassword()
                        .trim();

        Usuario usuario =
                usuarioRepository
                        .findByCorreo(
                                correoNormalizado
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Datos de recuperacion no validos."
                                )
                        );

        if (usuario.getEstado() == null
                || !usuario.getEstado()) {

            throw new RuntimeException(
                    "Datos de recuperacion no validos."
            );
        }

        CodigoRecuperacionPassword codigoRecuperacion =
                codigoRecuperacionPasswordRepository
                        .findTopByCorreoAndUsadoFalseOrderByFechaCreacionDesc(
                                correoNormalizado
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "No hay un codigo de recuperacion activo."
                                )
                        );


        // =====================================================
        // VALIDAR EXPIRACIÓN
        // =====================================================

        if (codigoRecuperacion
                .getFechaExpiracion()
                .isBefore(
                        LocalDateTime.now()
                )) {

            codigoRecuperacion
                    .setUsado(true);

            codigoRecuperacionPasswordRepository
                    .save(
                            codigoRecuperacion
                    );

            throw new RuntimeException(
                    "El codigo de recuperacion expiro. Solicita uno nuevo."
            );
        }


        // =====================================================
        // OBTENER INTENTOS FALLIDOS
        // =====================================================

        int intentosFallidos =
                codigoRecuperacion
                        .getIntentosFallidos() == null

                        ? 0

                        : codigoRecuperacion
                                .getIntentosFallidos();


        // =====================================================
        // BLOQUEO POR INTENTOS
        // =====================================================

        if (intentosFallidos
                >= MAX_INTENTOS_RECUPERACION) {

            codigoRecuperacion
                    .setUsado(true);

            codigoRecuperacionPasswordRepository
                    .save(
                            codigoRecuperacion
                    );

            throw new RuntimeException(
                    "El codigo fue bloqueado por demasiados intentos. Solicita uno nuevo."
            );
        }


        // =====================================================
        // VALIDAR CÓDIGO
        // =====================================================

        boolean codigoCorrecto =
                codigoRecuperacionValido(
                        codigoIngresado,
                        codigoRecuperacion.getCodigo()
                );

        if (!codigoCorrecto) {

            int nuevosIntentos =
                    intentosFallidos + 1;

            codigoRecuperacion
                    .setIntentosFallidos(
                            nuevosIntentos
                    );


            // =============================================
            // QUINTO INTENTO FALLIDO
            // =============================================

            if (nuevosIntentos
                    >= MAX_INTENTOS_RECUPERACION) {

                codigoRecuperacion
                        .setUsado(true);

                codigoRecuperacionPasswordRepository
                        .save(
                                codigoRecuperacion
                        );

                throw new RuntimeException(
                        "El codigo fue bloqueado por demasiados intentos. Solicita uno nuevo."
                );
            }


            // =============================================
            // GUARDAR INTENTO FALLIDO
            // =============================================

            codigoRecuperacionPasswordRepository
                    .save(
                            codigoRecuperacion
                    );

            int intentosRestantes =
                    MAX_INTENTOS_RECUPERACION
                            - nuevosIntentos;

            throw new RuntimeException(
                    "El codigo de recuperacion no es valido. Intentos restantes: "
                            + intentosRestantes
            );
        }


        // =====================================================
        // VALIDAR NUEVA CONTRASEÑA
        // =====================================================

        validarNuevaPassword(
                nuevaPassword
        );

        /*
         * La nueva contraseña tampoco puede ser
         * igual a la contraseña actual.
         */
        if (passwordEncoder.matches(
                nuevaPassword,
                usuario.getPassword()
        )) {

            throw new RuntimeException(
                    "La nueva contraseña debe ser diferente a la actual."
            );
        }


        // =====================================================
        // CAMBIAR CONTRASEÑA
        // =====================================================

        usuario.setPassword(
                passwordEncoder.encode(
                        nuevaPassword
                )
        );

        usuarioRepository
                .save(
                        usuario
                );


        // =====================================================
        // INVALIDAR EL CÓDIGO
        // =====================================================

        codigoRecuperacion
                .setUsado(true);

        codigoRecuperacionPasswordRepository
                .save(
                        codigoRecuperacion
                );

        return "Contrasena actualizada correctamente.";
    }


    // =========================================================
    // VALIDAR CONTRASEÑA
    // =========================================================

    private boolean passwordValida(
            Usuario usuario,
            String passwordIngresada) {

        String passwordGuardada =
                usuario.getPassword();

        if (passwordGuardada == null
                || passwordGuardada.isBlank()) {

            return false;
        }

        /*
         * Contraseñas modernas BCrypt.
         */
        if (esHashBCrypt(
                passwordGuardada
        )) {

            return passwordEncoder
                    .matches(
                            passwordIngresada,
                            passwordGuardada
                    );
        }

        /*
         * Compatibilidad con usuarios antiguos que
         * todavía pudieran tener contraseña en texto plano.
         *
         * Si coincide, se migra automáticamente a BCrypt.
         */
        if (!passwordGuardada
                .equals(
                        passwordIngresada
                )) {

            return false;
        }

        usuario.setPassword(
                passwordEncoder.encode(
                        passwordIngresada
                )
        );

        usuarioRepository
                .save(
                        usuario
                );

        return true;
    }


    // =========================================================
    // VALIDAR CÓDIGO DE RECUPERACIÓN
    // =========================================================

    private boolean codigoRecuperacionValido(
            String codigoIngresado,
            String codigoGuardado) {

        if (codigoGuardado == null
                || codigoGuardado.isBlank()) {

            return false;
        }

        /*
         * Código generado con el sistema nuevo.
         */
        if (esHashBCrypt(
                codigoGuardado
        )) {

            return passwordEncoder
                    .matches(
                            codigoIngresado,
                            codigoGuardado
                    );
        }

        /*
         * Compatibilidad temporal con códigos que
         * hayan sido creados antes de esta actualización.
         *
         * Después de generar un código nuevo,
         * todos se almacenarán con BCrypt.
         */
        return codigoGuardado
                .equals(
                        codigoIngresado
                );
    }


    // =========================================================
    // IDENTIFICAR HASH BCrypt
    // =========================================================

    private boolean esHashBCrypt(
            String valor) {

        if (valor == null) {
            return false;
        }

        return valor.startsWith("$2a$")
                || valor.startsWith("$2b$")
                || valor.startsWith("$2y$");
    }


    // =========================================================
    // VALIDAR NUEVA CONTRASEÑA
    // =========================================================

    private void validarNuevaPassword(
            String nuevaPassword) {

        if (nuevaPassword == null
                || nuevaPassword.length() < 6) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La nueva contraseña debe tener al menos 6 caracteres."
            );
        }
    }


    // =========================================================
    // GENERAR CÓDIGO DE RECUPERACIÓN
    // =========================================================

    private String generarCodigoRecuperacion() {

        return String.format(
                "%06d",
                SECURE_RANDOM.nextInt(
                        1_000_000
                )
        );
    }
}