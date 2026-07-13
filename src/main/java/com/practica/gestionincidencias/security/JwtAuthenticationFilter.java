package com.practica.gestionincidencias.security;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String authorizationHeader =
                request.getHeader(HttpHeaders.AUTHORIZATION);

        // Si no existe el encabezado Authorization,
        // la petición continúa sin usuario autenticado.
        if (authorizationHeader == null
                || !authorizationHeader.startsWith("Bearer ")) {

            filterChain.doFilter(request, response);
            return;
        }

        // Elimina la palabra "Bearer " y deja solamente el token.
        String token = authorizationHeader.substring(7);

        try {

            Claims claims = jwtService.obtenerClaims(token);

            String correo = claims.getSubject();
            String rol = claims.get("rol", String.class);

            Number usuarioIdClaim =
                    claims.get("usuarioId", Number.class);

            Integer usuarioId =
                    usuarioIdClaim != null
                            ? usuarioIdClaim.intValue()
                            : null;

            /*
             * Solo crea la autenticación si el token contiene
             * correo y rol, y todavía no existe otra autenticación.
             */
            if (correo != null
                    && rol != null
                    && SecurityContextHolder
                            .getContext()
                            .getAuthentication() == null) {

                SimpleGrantedAuthority autoridad =
                        new SimpleGrantedAuthority(
                                "ROLE_" + normalizarRol(rol)
                        );

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                correo,
                                null,
                                List.of(autoridad)
                        );

                /*
                 * Guardamos el ID del usuario dentro de los detalles
                 * de la autenticación para utilizarlo posteriormente.
                 */
                authentication.setDetails(usuarioId);

                SecurityContextHolder
                        .getContext()
                        .setAuthentication(authentication);
            }

        } catch (JwtException | IllegalArgumentException error) {

            /*
             * Si el token está vencido, alterado o es inválido,
             * eliminamos cualquier autenticación.
             */
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }

    private String normalizarRol(String rol) {

        String rolNormalizado =
                rol.trim().toUpperCase();

        if (rolNormalizado.startsWith("ROLE_")) {
            return rolNormalizado.substring(5);
        }

        return rolNormalizado;
    }
}