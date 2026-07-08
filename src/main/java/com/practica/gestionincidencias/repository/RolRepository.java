package com.practica.gestionincidencias.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.practica.gestionincidencias.entity.Rol;

public interface RolRepository extends JpaRepository<Rol, Integer> {

    Optional<Rol> findByNombre(String nombre);
}