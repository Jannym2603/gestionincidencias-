package com.practica.gestionincidencias.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.practica.gestionincidencias.entity.AuditoriaConfiguracion;

@Repository
public interface AuditoriaConfiguracionRepository
        extends JpaRepository<AuditoriaConfiguracion, Integer> {

    List<AuditoriaConfiguracion> findAllByOrderByFechaCambioDesc();
}