package com.practica.gestionincidencias.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.practica.gestionincidencias.entity.Proyecto;

public interface ProyectoRepository
        extends JpaRepository<Proyecto, Integer> {

    List<Proyecto> findByCompaniaIdOrderByNombreAsc(
            Integer companiaId
    );

    List<Proyecto> findByCompaniaIdAndEstadoTrueOrderByNombreAsc(
            Integer companiaId
    );

    List<Proyecto> findByEstadoTrueOrderByNombreAsc();

    boolean existsByCompaniaIdAndNombreIgnoreCase(
            Integer companiaId,
            String nombre
    );
}