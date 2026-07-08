package com.practica.gestionincidencias.controller;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.practica.gestionincidencias.entity.Adjunto;
import com.practica.gestionincidencias.entity.Ticket;
import com.practica.gestionincidencias.repository.AdjuntoRepository;
import com.practica.gestionincidencias.repository.TicketRepository;

@RestController
@RequestMapping("/api/adjuntos")
public class AdjuntoController {

    private final AdjuntoRepository adjuntoRepository;
    private final TicketRepository ticketRepository;

    private final Path carpetaAdjuntos = Paths.get("uploads", "adjuntos");
    private static final long TAMANIO_MAXIMO_BYTES = 10 * 1024 * 1024;
    private static final Set<String> EXTENSIONES_PERMITIDAS = Set.of(
            ".pdf",
            ".doc",
            ".docx",
            ".png",
            ".jpg",
            ".jpeg",
            ".txt",
            ".xlsx",
            ".xls"
    );

    public AdjuntoController(
            AdjuntoRepository adjuntoRepository,
            TicketRepository ticketRepository
    ) {
        this.adjuntoRepository = adjuntoRepository;
        this.ticketRepository = ticketRepository;
    }

    @GetMapping("/ticket/{ticketId}")
    public List<AdjuntoResponse> listarAdjuntosPorTicket(@PathVariable Integer ticketId) {
        return adjuntoRepository.findByTicketIdOrderByFechaSubidaDesc(ticketId)
                .stream()
                .map(this::convertirADTO)
                .toList();
    }

    @PostMapping("/ticket/{ticketId}")
    public AdjuntoResponse subirAdjunto(
            @PathVariable Integer ticketId,
            @RequestParam("archivo") MultipartFile archivo
    ) {
        if (archivo == null || archivo.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Debes seleccionar un archivo."
            );
        }

        if (archivo.getSize() > TAMANIO_MAXIMO_BYTES) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El archivo supera el tamano maximo permitido de 10 MB."
            );
        }

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Ticket no encontrado."
                ));

        try {
            Files.createDirectories(carpetaAdjuntos);

            String nombreOriginal = archivo.getOriginalFilename();

            if (nombreOriginal == null || nombreOriginal.isBlank()) {
                nombreOriginal = "archivo";
            }

            String extension = obtenerExtension(nombreOriginal);

            if (!EXTENSIONES_PERMITIDAS.contains(extension.toLowerCase())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Tipo de archivo no permitido."
                );
            }

            String nombreGuardado = UUID.randomUUID() + extension;

            Path rutaFinal = carpetaAdjuntos.resolve(nombreGuardado).normalize();

            if (!rutaFinal.startsWith(carpetaAdjuntos)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Ruta de archivo no valida."
                );
            }

            Files.copy(archivo.getInputStream(), rutaFinal);

            Adjunto adjunto = Adjunto.builder()
                    .ticket(ticket)
                    .nombreArchivo(nombreOriginal)
                    .rutaArchivo(rutaFinal.toString())
                    .tipoArchivo(archivo.getContentType())
                    .tamanio(archivo.getSize())
                    .fechaSubida(LocalDateTime.now())
                    .build();

            Adjunto adjuntoGuardado = adjuntoRepository.save(adjunto);

            return convertirADTO(adjuntoGuardado);

        } catch (IOException error) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "No se pudo guardar el archivo."
            );
        }
    }

    @GetMapping("/{id}/descargar")
    public ResponseEntity<Resource> descargarAdjunto(@PathVariable Integer id) {
        Adjunto adjunto = adjuntoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Adjunto no encontrado."
                ));

        try {
            Path rutaArchivo = Paths.get(adjunto.getRutaArchivo()).normalize();
            Resource recurso = new UrlResource(rutaArchivo.toUri());

            if (!recurso.exists() || !recurso.isReadable()) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "El archivo no existe o no se puede leer."
                );
            }

            String tipoContenido = adjunto.getTipoArchivo();

            if (tipoContenido == null || tipoContenido.isBlank()) {
                tipoContenido = "application/octet-stream";
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(tipoContenido))
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            ContentDisposition.attachment()
                                    .filename(adjunto.getNombreArchivo())
                                    .build()
                                    .toString()
                    )
                    .body(recurso);

        } catch (MalformedURLException error) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "No se pudo descargar el archivo."
            );
        }
    }

    private String obtenerExtension(String nombreArchivo) {
        int punto = nombreArchivo.lastIndexOf(".");

        if (punto == -1) {
            return "";
        }

        return nombreArchivo.substring(punto);
    }

    private AdjuntoResponse convertirADTO(Adjunto adjunto) {
        return new AdjuntoResponse(
                adjunto.getId(),
                adjunto.getTicket().getId(),
                adjunto.getNombreArchivo(),
                adjunto.getTipoArchivo(),
                adjunto.getTamanio(),
                adjunto.getFechaSubida(),
                "/api/adjuntos/" + adjunto.getId() + "/descargar"
        );
    }

    public record AdjuntoResponse(
            Integer id,
            Integer ticketId,
            String nombreArchivo,
            String tipoArchivo,
            Long tamanio,
            LocalDateTime fechaSubida,
            String urlDescarga
    ) {
    }
}