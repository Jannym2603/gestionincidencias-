package com.practica.gestionincidencias.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.practica.gestionincidencias.entity.UsuarioRol;

public interface UsuarioRolRepository extends JpaRepository<UsuarioRol, Integer> {

    Optional<UsuarioRol> findByUsuarioId(Integer usuarioId);
}