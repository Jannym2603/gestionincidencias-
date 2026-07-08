package com.practica.gestionincidencias.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.practica.gestionincidencias.entity.CodigoRecuperacionPassword;

public interface CodigoRecuperacionPasswordRepository extends JpaRepository<CodigoRecuperacionPassword, Integer> {

    Optional<CodigoRecuperacionPassword> findTopByCorreoAndUsadoFalseOrderByFechaCreacionDesc(String correo);

    void deleteByCorreo(String correo);
}
