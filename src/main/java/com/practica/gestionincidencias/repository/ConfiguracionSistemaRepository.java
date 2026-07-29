package com.practica.gestionincidencias.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.practica.gestionincidencias.entity.ConfiguracionSistema;

public interface ConfiguracionSistemaRepository
        extends JpaRepository<ConfiguracionSistema, Integer> {
}