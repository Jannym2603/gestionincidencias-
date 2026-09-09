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

import com.practica.gestionincidencias.dto.CompaniaRequestDTO;
import com.practica.gestionincidencias.dto.CompaniaResponseDTO;
import com.practica.gestionincidencias.entity.Compania;
import com.practica.gestionincidencias.repository.CompaniaRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/companias")
public class CompaniaController {

    private final CompaniaRepository companiaRepository;

    public CompaniaController(
            CompaniaRepository companiaRepository) {

        this.companiaRepository = companiaRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public List<CompaniaResponseDTO> listarCompanias() {

        return companiaRepository
                .findAll()
                .stream()
                .map(this::convertirADTO)
                .toList();
    }

    @GetMapping("/activas")
    public List<CompaniaResponseDTO> listarCompaniasActivas() {

        return companiaRepository
                .findByEstadoTrueOrderByNombreAsc()
                .stream()
                .map(this::convertirADTO)
                .toList();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public CompaniaResponseDTO obtenerCompania(
            @PathVariable Integer id) {

        Compania compania =
                companiaRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Compañía no encontrada."
                                )
                        );

        return convertirADTO(compania);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public CompaniaResponseDTO crearCompania(
            @Valid @RequestBody CompaniaRequestDTO request) {

        String nombre =
                request.getNombre()
                        .trim();

        if (
                companiaRepository
                        .existsByNombreIgnoreCase(nombre)
        ) {

            throw new RuntimeException(
                    "Ya existe una compañía con ese nombre."
            );
        }

        LocalDateTime ahora =
                LocalDateTime.now();

        Compania compania =
                Compania.builder()
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

        Compania guardada =
                companiaRepository.save(compania);

        return convertirADTO(guardada);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public CompaniaResponseDTO actualizarCompania(
            @PathVariable Integer id,
            @Valid @RequestBody CompaniaRequestDTO request) {

        Compania compania =
                companiaRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Compañía no encontrada."
                                )
                        );

        String nombreNuevo =
                request.getNombre()
                        .trim();

        boolean nombreCambio =
                !compania.getNombre()
                        .equalsIgnoreCase(nombreNuevo);

        if (
                nombreCambio &&
                companiaRepository
                        .existsByNombreIgnoreCase(nombreNuevo)
        ) {

            throw new RuntimeException(
                    "Ya existe una compañía con ese nombre."
            );
        }

        compania.setNombre(nombreNuevo);

        compania.setDescripcion(
                normalizarOpcional(
                        request.getDescripcion()
                )
        );

        if (request.getEstado() != null) {
            compania.setEstado(
                    request.getEstado()
            );
        }

        compania.setFechaActualizacion(
                LocalDateTime.now()
        );

        Compania actualizada =
                companiaRepository.save(compania);

        return convertirADTO(actualizada);
    }

    @PutMapping("/{id}/estado")
    @PreAuthorize("hasRole('ADMIN')")
    public CompaniaResponseDTO cambiarEstado(
            @PathVariable Integer id,
            @RequestBody Boolean estado) {

        if (estado == null) {
            throw new RuntimeException(
                    "El estado es obligatorio."
            );
        }

        Compania compania =
                companiaRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Compañía no encontrada."
                                )
                        );

        compania.setEstado(estado);

        compania.setFechaActualizacion(
                LocalDateTime.now()
        );

        Compania actualizada =
                companiaRepository.save(compania);

        return convertirADTO(actualizada);
    }

    private CompaniaResponseDTO convertirADTO(
            Compania compania) {

        return new CompaniaResponseDTO(
                compania.getId(),
                compania.getNombre(),
                compania.getDescripcion(),
                compania.getEstado(),
                compania.getFechaCreacion(),
                compania.getFechaActualizacion()
        );
    }

    private String normalizarOpcional(
            String valor) {

        if (
                valor == null ||
                valor.isBlank()
        ) {
            return null;
        }

        return valor.trim();
    }
}