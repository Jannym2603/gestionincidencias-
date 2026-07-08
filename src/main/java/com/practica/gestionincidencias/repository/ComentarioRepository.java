package com.practica.gestionincidencias.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.practica.gestionincidencias.entity.Comentario;

public interface ComentarioRepository extends JpaRepository<Comentario, Integer> {

    List<Comentario> findByTicketId(Integer ticketId);
}