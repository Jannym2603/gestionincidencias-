package com.practica.gestionincidencias.controller;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.practica.gestionincidencias.dto.ProyectoRequestDTO;
import com.practica.gestionincidencias.dto.ProyectoResponseDTO;
import com.practica.gestionincidencias.entity.Compania;
import com.practica.gestionincidencias.entity.Proyecto;
import com.practica.gestionincidencias.repository.CompaniaRepository;
import com.practica.gestionincidencias.repository.ProyectoRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/proyectos")
public class ProyectoController {

    private final ProyectoRepository proyectoRepository;
    private final CompaniaRepository companiaRepository;

    public ProyectoController(
            ProyectoRepository proyectoRepository,
            CompaniaRepository companiaRepository) {

        this.proyectoRepository = proyectoRepository;
        this.companiaRepository = companiaRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public List<ProyectoResponseDTO> listarProyectos() {

        return proyectoRepository
                .findAll()
                .stream()
                .map(this::convertirADTO)
                .toList();
    }

    @GetMapping("/activos")
    public List<ProyectoResponseDTO> listarProyectosActivos() {

        return proyectoRepository
                .findByEstadoTrueOrderByNombreAsc()
                .stream()
                .map(this::convertirADTO)
                .toList();
    }

    @GetMapping("/compania/{companiaId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public List<ProyectoResponseDTO> listarPorCompania(
            @PathVariable Integer companiaId) {

        validarCompaniaExistente(companiaId);

        return proyectoRepository
                .findByCompaniaIdOrderByNombreAsc(companiaId)
                .stream()
                .map(this::convertirADTO)
                .toList();
    }

    @GetMapping("/compania/{companiaId}/activos")
    public List<ProyectoResponseDTO> listarActivosPorCompania(
            @PathVariable Integer companiaId) {

        validarCompaniaExistente(companiaId);

        return proyectoRepository
                .findByCompaniaIdAndEstadoTrueOrderByNombreAsc(
                        companiaId
                )
                .stream()
                .map(this::convertirADTO)
                .toList();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public ProyectoResponseDTO obtenerProyecto(
            @PathVariable Integer id) {

        Proyecto proyecto =
                obtenerProyectoPorId(id);

        return convertirADTO(proyecto);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public ProyectoResponseDTO crearProyecto(
            @Valid @RequestBody ProyectoRequestDTO request) {

        Compania compania =
                companiaRepository
                        .findById(request.getCompaniaId())
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Compañía no encontrada."
                                )
                        );

        if (!Boolean.TRUE.equals(compania.getEstado())) {
            throw new RuntimeException(
                    "No se puede crear un proyecto en una compañía inactiva."
            );
        }

        String nombre =
                request.getNombre()
                        .trim();

        if (
                proyectoRepository
                        .existsByCompaniaIdAndNombreIgnoreCase(
                                compania.getId(),
                                nombre
                        )
        ) {

            throw new RuntimeException(
                    "Ya existe un proyecto con ese nombre "
                            + "dentro de la compañía."
            );
        }

        LocalDateTime ahora =
                LocalDateTime.now();

        Proyecto proyecto =
                Proyecto.builder()
                        .compania(compania)
                        .nombre(nombre)
                        .descripcion(
                                normalizarOpcional(
                                        request.getDescripcion()
                                )
                        )
                        .estado(
                                request.getEstado() != null
                                        ? request.getEstado()
                                        : true
                        )
                        .fechaCreacion(ahora)
                        .fechaActualizacion(ahora)
                        .build();

        Proyecto guardado =
                proyectoRepository.save(proyecto);

        return convertirADTO(guardado);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ProyectoResponseDTO actualizarProyecto(
            @PathVariable Integer id,
            @Valid @RequestBody ProyectoRequestDTO request) {

        Proyecto proyecto =
                obtenerProyectoPorId(id);

        Compania compania =
                companiaRepository
                        .findById(request.getCompaniaId())
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Compañía no encontrada."
                                )
                        );

        if (!Boolean.TRUE.equals(compania.getEstado())) {
            throw new RuntimeException(
                    "No se puede asignar el proyecto "
                            + "a una compañía inactiva."
            );
        }

        String nombreNuevo =
                request.getNombre()
                        .trim();

        boolean cambioCompania =
                !proyecto.getCompania()
                        .getId()
                        .equals(compania.getId());

        boolean cambioNombre =
                !proyecto.getNombre()
                        .equalsIgnoreCase(nombreNuevo);

        if (
                (cambioCompania || cambioNombre) &&
                proyectoRepository
                        .existsByCompaniaIdAndNombreIgnoreCase(
                                compania.getId(),
                                nombreNuevo
                        )
        ) {

            throw new RuntimeException(
                    "Ya existe un proyecto con ese nombre "
                            + "dentro de la compañía."
            );
        }

        proyecto.setCompania(compania);
        proyecto.setNombre(nombreNuevo);

        proyecto.setDescripcion(
                normalizarOpcional(
                        request.getDescripcion()
                )
        );

        if (request.getEstado() != null) {
            proyecto.setEstado(
                    request.getEstado()
            );
        }

        proyecto.setFechaActualizacion(
                LocalDateTime.now()
        );

        Proyecto actualizado =
                proyectoRepository.save(proyecto);

        return convertirADTO(actualizado);
    }

    @PutMapping("/{id}/estado")
    @PreAuthorize("hasRole('ADMIN')")
    public ProyectoResponseDTO cambiarEstado(
            @PathVariable Integer id,
            @RequestBody Boolean estado) {

        if (estado == null) {
            throw new RuntimeException(
                    "El estado es obligatorio."
            );
        }

        Proyecto proyecto =
                obtenerProyectoPorId(id);

        if (
                estado &&
                !Boolean.TRUE.equals(
                        proyecto.getCompania().getEstado()
                )
        ) {

            throw new RuntimeException(
                    "No se puede activar un proyecto "
                            + "de una compañía inactiva."
            );
        }

        proyecto.setEstado(estado);

        proyecto.setFechaActualizacion(
                LocalDateTime.now()
        );

        Proyecto actualizado =
                proyectoRepository.save(proyecto);

        return convertirADTO(actualizado);
    }

    private Proyecto obtenerProyectoPorId(
            Integer id) {

        return proyectoRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Proyecto no encontrado."
                        )
                );
    }

    private void validarCompaniaExistente(
            Integer companiaId) {

        if (!companiaRepository.existsById(companiaId)) {
            throw new RuntimeException(
                    "Compañía no encontrada."
            );
        }
    }

    private ProyectoResponseDTO convertirADTO(
            Proyecto proyecto) {

        return new ProyectoResponseDTO(
                proyecto.getId(),
                proyecto.getCompania().getId(),
                proyecto.getCompania().getNombre(),
                proyecto.getNombre(),
                proyecto.getDescripcion(),
                proyecto.getEstado(),
                proyecto.getFechaCreacion(),
                proyecto.getFechaActualizacion()
        );
    }

    private String normalizarOpcional(
            String valor) {

        if (valor == null || valor.isBlank()) {
            return null;
        }

        return valor.trim();
    }
}