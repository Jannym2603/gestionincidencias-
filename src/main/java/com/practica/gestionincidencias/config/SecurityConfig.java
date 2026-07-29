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
                /*
                 * Se desactiva CSRF porque la API utiliza
                 * autenticación mediante JWT.
                 */
                .csrf(csrf -> csrf.disable())

                /*
                 * Spring Security no guardará sesiones.
                 * Cada solicitud deberá utilizar su token JWT,
                 * excepto las rutas públicas.
                 */
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
                         * Página pública utilizada por la persona
                         * que recibe el enlace compartido.
                         */
                        .requestMatchers(
                                "/ticket-compartido.html",
                                "/ticket-compartido.js",
                                "/style.css"
                        ).permitAll()

                        /*
                         * Endpoints públicos de autenticación.
                         */
                        .requestMatchers(
                                "/api/auth/login",
                                "/api/auth/solicitar-recuperacion",
                                "/api/auth/confirmar-recuperacion"
                        ).permitAll()

                        /*
                         * Endpoint público para consultar un ticket
                         * mediante su token compartido.
                         */
                        .requestMatchers(
                                "/api/public/**"
                        ).permitAll()

                        /*
                         * Crear y administrar enlaces compartidos:
                         * solamente SUPERVISOR y ADMIN.
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
                         * Crear usuarios:
                         * solamente SUPERVISOR o ADMIN.
                         */
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/usuarios"
                        ).hasAnyRole(
                                "SUPERVISOR",
                                "ADMIN"
                        )

                        /*
                         * Reportes:
                         * solamente SUPERVISOR o ADMIN.
                         */
                        .requestMatchers(
                                "/api/reportes/**"
                        ).hasAnyRole(
                                "SUPERVISOR",
                                "ADMIN"
                        )

                        /*
                         * Consultar la configuración global:
                         * cualquier usuario autenticado.
                         */
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/configuracion-sistema"
                        ).authenticated()

                        /*
                         * Modificar la configuración global:
                         * solamente SUPERVISOR o ADMIN.
                         */
                        .requestMatchers(
                                HttpMethod.PUT,
                                "/api/configuracion-sistema"
                        ).hasAnyRole(
                                "SUPERVISOR",
                                "ADMIN"
                        )

                        /*
                         * Consultar la auditoría de configuración:
                         * solamente SUPERVISOR o ADMIN.
                         */
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/configuracion-sistema/auditoria"
                        ).hasAnyRole(
                                "SUPERVISOR",
                                "ADMIN"
                        )

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
                         * Todos los demás endpoints de la API
                         * requieren un usuario autenticado.
                         */
                        .requestMatchers(
                                "/api/**"
                        ).authenticated()

                        /*
                         * Otros recursos estáticos.
                         */
                        .anyRequest()
                        .permitAll()
                )

                /*
                 * Respuesta cuando no existe un token JWT
                 * o el token recibido no es válido.
                 */
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

                        /*
                         * Respuesta cuando el usuario inició sesión,
                         * pero no tiene el rol necesario.
                         */
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

                /*
                 * No se utilizará el formulario de acceso
                 * predeterminado de Spring.
                 */
                .formLogin(form -> form.disable())

                /*
                 * No se utilizará autenticación HTTP Basic.
                 */
                .httpBasic(basic -> basic.disable())

                /*
                 * Se ejecuta el filtro JWT antes del filtro
                 * de autenticación estándar de Spring.
                 */
                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}