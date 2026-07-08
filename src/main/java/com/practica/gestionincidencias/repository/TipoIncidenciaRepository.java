package com.practica.gestionincidencias.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.practica.gestionincidencias.entity.TipoIncidencia;

public interface TipoIncidenciaRepository extends JpaRepository<TipoIncidencia, Integer> {
}