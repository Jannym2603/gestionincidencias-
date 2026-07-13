package com.practica.gestionincidencias.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

    private final SecretKey secretKey;
    private final long expirationMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs) {

        if (secret == null ||
                secret.getBytes(StandardCharsets.UTF_8).length < 32) {

            throw new IllegalStateException(
                    "La clave JWT debe tener al menos 32 caracteres."
            );
        }

        this.secretKey = Keys.hmacShaKeyFor(
                secret.getBytes(StandardCharsets.UTF_8)
        );

        this.expirationMs = expirationMs;
    }

    public String generarToken(
            Integer usuarioId,
            String correo,
            String rol) {

        Date ahora = new Date();

        Date expiracion = new Date(
                ahora.getTime() + expirationMs
        );

        return Jwts.builder()
                .subject(correo)
                .claim("usuarioId", usuarioId)
                .claim("rol", rol)
                .issuedAt(ahora)
                .expiration(expiracion)
                .signWith(secretKey)
                .compact();
    }

    public Claims obtenerClaims(String token) {

        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}