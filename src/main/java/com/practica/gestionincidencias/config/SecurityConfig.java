package com.practica.gestionincidencias.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.practica.gestionincidencias.security.JwtAuthenticationFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter) {

        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        http
                .csrf(csrf -> csrf.disable())

                .sessionManagement(session -> session
                        .sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                .authorizeHttpRequests(auth -> auth

                        /*
                         * Archivos públicos del frontend.
                         */
                        .requestMatchers(
                                "/",
                                "/login.html",
                                "/favicon.ico",
                                "/*.html",
                                "/*.js",
                                "/*.css",
                                "/images/**"
                        ).permitAll()

                        /*
                         * Página pública del enlace compartido.
                         */
                        .requestMatchers(
                                "/ticket-compartido.html",
                                "/ticket-compartido.js",
                                "/style.css"
                        ).permitAll()

                        /*
                         * Autenticación pública.
                         */
                        .requestMatchers(
                                "/api/auth/login",
                                "/api/auth/solicitar-recuperacion",
                                "/api/auth/confirmar-recuperacion"
                        ).permitAll()

                        /*
                         * Consulta pública mediante enlace compartido.
                         */
                        .requestMatchers(
                                "/api/public/**"
                        ).permitAll()

                        /*
                         * Enlaces compartidos.
                         */
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/tickets/*/compartir"
                        ).hasAnyRole(
                                "SUPERVISOR",
                                "ADMIN"
                        )

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/tickets/*/enlaces-compartidos"
                        ).hasAnyRole(
                                "SUPERVISOR",
                                "ADMIN"
                        )

                        .requestMatchers(
                                HttpMethod.DELETE,
                                "/api/tickets/enlaces-compartidos/*"
                        ).hasAnyRole(
                                "SUPERVISOR",
                                "ADMIN"
                        )

                        /*
                         * Cambio de contraseña del usuario autenticado.
                         */
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/auth/cambiar-password"
                        ).authenticated()

                        /*
                         * Perfil propio.
                         * Disponible para cualquier usuario autenticado.
                         */
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/usuarios/me"
                        ).authenticated()

                        /*
                         * Directorio completo de usuarios.
                         * CLIENTE y AGENTE no pueden consultarlo.
                         */
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/usuarios"
                        ).hasAnyRole(
                                "SUPERVISOR",
                                "ADMIN"
                        )

                        /*
                         * Crear usuarios.
                         * El controlador aplica además la regla:
                         * SUPERVISOR solo puede crear CLIENTE o AGENTE.
                         */
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/usuarios"
                        ).hasAnyRole(
                                "SUPERVISOR",
                                "ADMIN"
                        )

                        /*
                         * Historial / auditoría.
                         *
                         * Todos los roles autenticados pueden acceder
                         * a los endpoints de historial.
                         *
                         * La validación específica de qué tickets puede
                         * consultar cada usuario se realiza dentro de
                         * HistorialTicketController y AccesoProyectoService.
                         */
                        .requestMatchers(
                                "/api/historial-tickets/**"
                        ).hasAnyRole(
                                "CLIENTE",
                                "AGENTE",
                                "SUPERVISOR",
                                "ADMIN"
                        )

                        /*
                         * Reportes.
                         */
                        .requestMatchers(
                                "/api/reportes/**"
                        ).hasAnyRole(
                                "CLIENTE",
                                "AGENTE",
                                "SUPERVISOR",
                                "ADMIN"
                        )

                        /*
                         * Configuración global.
                         */
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/configuracion-sistema"
                        ).authenticated()

                        .requestMatchers(
                                HttpMethod.PUT,
                                "/api/configuracion-sistema"
                        ).hasRole(
                                "ADMIN"
                        )

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/configuracion-sistema/auditoria"
                        ).hasRole(
                                "ADMIN"
                        )

                        /*
                         * Compañías.
                         */
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/companias"
                        ).hasRole(
                                "ADMIN"
                        )

                        .requestMatchers(
                                HttpMethod.PUT,
                                "/api/companias/**"
                        ).hasRole(
                                "ADMIN"
                        )

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/companias/**"
                        ).hasAnyRole(
                                "ADMIN",
                                "SUPERVISOR"
                        )

                        /*
                         * Proyectos.
                         */
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/proyectos"
                        ).hasRole(
                                "ADMIN"
                        )

                        .requestMatchers(
                                HttpMethod.PUT,
                                "/api/proyectos/**"
                        ).hasRole(
                                "ADMIN"
                        )

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/proyectos/**"
                        ).hasAnyRole(
                                "ADMIN",
                                "SUPERVISOR"
                        )

                        /*
                         * Asignar usuarios a proyectos.
                         * ADMIN y SUPERVISOR pueden crear,
                         * activar o desactivar accesos.
                         */
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/usuario-proyectos"
                        ).hasAnyRole(
                                "ADMIN",
                                "SUPERVISOR"
                        )

                        .requestMatchers(
                                HttpMethod.PUT,
                                "/api/usuario-proyectos/**"
                        ).hasAnyRole(
                                "ADMIN",
                                "SUPERVISOR"
                        )

                        /*
                         * Consultar proyectos asignados.
                         * Todos los usuarios autenticados pueden
                         * acceder; el controlador aplica las
                         * restricciones adicionales por endpoint.
                         */
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/usuario-proyectos/**"
                        ).authenticated()

                        /*
                         * Administración de roles.
                         */
                        .requestMatchers(
                                "/api/roles/**",
                                "/api/usuario-roles/**"
                        ).hasAnyRole(
                                "SUPERVISOR",
                                "ADMIN"
                        )

                        /*
                         * Resto de la API.
                         */
                        .requestMatchers(
                                "/api/**"
                        ).authenticated()

                        .anyRequest()
                        .permitAll()
                )

                .exceptionHandling(errors -> errors

                        .authenticationEntryPoint(
                                (request, response, exception) -> {

                                    response.setStatus(401);

                                    response.setContentType(
                                            "application/json;charset=UTF-8"
                                    );

                                    response.getWriter().write(
                                            "{\"message\":\"Debes iniciar sesión para continuar.\"}"
                                    );
                                }
                        )

                        .accessDeniedHandler(
                                (request, response, exception) -> {

                                    response.setStatus(403);

                                    response.setContentType(
                                            "application/json;charset=UTF-8"
                                    );

                                    response.getWriter().write(
                                            "{\"message\":\"No tienes permiso para realizar esta acción.\"}"
                                    );
                                }
                        )
                )

                .formLogin(form -> form.disable())

                .httpBasic(basic -> basic.disable())

                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}