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
                // Desactivamos CSRF porque la API usará JWT
                .csrf(csrf -> csrf.disable())

                // Spring no guardará sesiones en el servidor
                .sessionManagement(session -> session
                        .sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                .authorizeHttpRequests(auth -> auth

                        // Archivos del frontend
                        .requestMatchers(
                                "/",
                                "/login.html",
                                "/favicon.ico",
                                "/*.html",
                                "/*.js",
                                "/*.css",
                                "/images/**"
                        ).permitAll()

                        // Endpoints públicos
                        .requestMatchers(
                                "/api/auth/login",
                                "/api/auth/solicitar-recuperacion",
                                "/api/auth/confirmar-recuperacion"
                        ).permitAll()

                        // Crear usuarios: solo supervisor o administrador
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/usuarios"
                        ).hasAnyRole("SUPERVISOR", "ADMIN")

                        // Reportes: solo supervisor o administrador
                        .requestMatchers(
                                "/api/reportes/**"
                        ).hasAnyRole("SUPERVISOR", "ADMIN")

                        // Administración de roles
                        .requestMatchers(
                                "/api/roles/**",
                                "/api/usuario-roles/**"
                        ).hasAnyRole("SUPERVISOR", "ADMIN")

                        // Todo lo demás dentro de la API requiere login
                        .requestMatchers("/api/**")
                        .authenticated()

                        // Otros recursos
                        .anyRequest()
                        .permitAll()
                )

                // Mensaje cuando no hay token o es inválido
                .exceptionHandling(errors -> errors

                        .authenticationEntryPoint(
                                (request, response, exception) -> {

                                    response.setStatus(401);
                                    response.setContentType(
                                            "application/json;charset=UTF-8"
                                    );

                                    response.getWriter().write(
                                            "{\"message\":\"Debes iniciar sesion para continuar.\"}"
                                    );
                                }
                        )

                        // Mensaje cuando el usuario no tiene el rol necesario
                        .accessDeniedHandler(
                                (request, response, exception) -> {

                                    response.setStatus(403);
                                    response.setContentType(
                                            "application/json;charset=UTF-8"
                                    );

                                    response.getWriter().write(
                                            "{\"message\":\"No tienes permiso para realizar esta accion.\"}"
                                    );
                                }
                        )
                )

                // Desactivamos el formulario de login de Spring
                .formLogin(form -> form.disable())

                // Desactivamos autenticación básica
                .httpBasic(basic -> basic.disable())

                // Conectamos nuestro filtro JWT
                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}