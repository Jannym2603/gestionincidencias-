package com.practica.gestionincidencias.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.practica.gestionincidencias.entity.Compania;

public interface CompaniaRepository
        extends JpaRepository<Compania, Integer> {

    Optional<Compania> findByNombreIgnoreCase(
            String nombre
    );

    List<Compania> findByEstadoTrueOrderByNombreAsc();

    boolean existsByNombreIgnoreCase(
            String nombre
    );
}