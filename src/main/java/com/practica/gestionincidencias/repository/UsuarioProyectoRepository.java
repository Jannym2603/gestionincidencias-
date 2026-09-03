package com.practica.gestionincidencias.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.practica.gestionincidencias.entity.UsuarioProyecto;

public interface UsuarioProyectoRepository
        extends JpaRepository<UsuarioProyecto, Integer> {

    List<UsuarioProyecto> findByUsuarioIdAndEstadoTrue(
            Integer usuarioId
    );

    List<UsuarioProyecto> findByUsuarioIdOrderByIdDesc(
            Integer usuarioId
    );

    List<UsuarioProyecto> findByProyectoIdAndEstadoTrue(
            Integer proyectoId
    );

    Optional<UsuarioProyecto> findByUsuarioIdAndProyectoId(
            Integer usuarioId,
            Integer proyectoId
    );

    boolean existsByUsuarioIdAndProyectoIdAndEstadoTrue(
            Integer usuarioId,
            Integer proyectoId
    );
}