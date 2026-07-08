package com.practica.gestionincidencias.controller;

import com.practica.gestionincidencias.entity.TipoIncidencia;
import com.practica.gestionincidencias.repository.TipoIncidenciaRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tipos-incidencia")
public class TipoIncidenciaController {

    private final TipoIncidenciaRepository tipoIncidenciaRepository;

    public TipoIncidenciaController(TipoIncidenciaRepository tipoIncidenciaRepository) {
        this.tipoIncidenciaRepository = tipoIncidenciaRepository;
    }

    @GetMapping
    public List<TipoIncidencia> listarTiposIncidencia() {
        return tipoIncidenciaRepository.findAll();
    }
}