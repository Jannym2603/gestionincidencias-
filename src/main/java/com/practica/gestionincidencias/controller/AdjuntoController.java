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
import com.practica.gestionincidencias.entity.Usuario;
import com.practica.gestionincidencias.repository.AdjuntoRepository;
import com.practica.gestionincidencias.repository.TicketRepository;
import com.practica.gestionincidencias.service.AccesoProyectoService;

@RestController
@RequestMapping("/api/adjuntos")
public class AdjuntoController {

    private final AdjuntoRepository adjuntoRepository;
    private final TicketRepository ticketRepository;
    private final AccesoProyectoService accesoProyectoService;

    private final Path carpetaAdjuntos =
            Paths.get("uploads", "adjuntos");

    private static final long TAMANIO_MAXIMO_BYTES =
            10 * 1024 * 1024;

    private static final Set<String> EXTENSIONES_PERMITIDAS =
            Set.of(
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
            TicketRepository ticketRepository,
            AccesoProyectoService accesoProyectoService
    ) {

        this.adjuntoRepository = adjuntoRepository;
        this.ticketRepository = ticketRepository;
        this.accesoProyectoService = accesoProyectoService;
    }

    /*
     * Lista los adjuntos de un ticket.
     *
     * Antes de devolver los archivos,
     * valida que el usuario autenticado
     * realmente tenga acceso al ticket.
     */
    @GetMapping("/ticket/{ticketId}")
    public List<AdjuntoResponse> listarAdjuntosPorTicket(
            @PathVariable Integer ticketId) {

        Ticket ticket =
                ticketRepository
                        .findById(ticketId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Ticket no encontrado."
                                )
                        );

        validarAccesoTicket(ticket);

        return adjuntoRepository
                .findByTicketIdOrderByFechaSubidaDesc(ticketId)
                .stream()
                .map(this::convertirADTO)
                .toList();
    }

    /*
     * Permite subir un adjunto solamente
     * si el usuario tiene acceso al ticket.
     */
    @PostMapping("/ticket/{ticketId}")
    public AdjuntoResponse subirAdjunto(
            @PathVariable Integer ticketId,
            @RequestParam("archivo") MultipartFile archivo) {

        if (
                archivo == null
                        || archivo.isEmpty()
        ) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Debes seleccionar un archivo."
            );
        }

        if (archivo.getSize() > TAMANIO_MAXIMO_BYTES) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El archivo supera el tamaño máximo permitido de 10 MB."
            );
        }

        /*
         * Primero buscamos el ticket.
         */
        Ticket ticket =
                ticketRepository
                        .findById(ticketId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Ticket no encontrado."
                                )
                        );

        /*
         * Comprobamos que quien intenta subir
         * el archivo tenga acceso al ticket.
         */
        validarAccesoTicket(ticket);

        try {

            String nombreOriginal =
                    archivo.getOriginalFilename();

            if (
                    nombreOriginal == null
                            || nombreOriginal.isBlank()
            ) {

                nombreOriginal = "archivo";
            }

            /*
             * Evitamos conservar rutas que pudiera
             * enviar el navegador.
             *
             * Por ejemplo:
             *
             * C:\Usuarios\archivo.pdf
             *
             * se convierte solamente en:
             *
             * archivo.pdf
             */
            nombreOriginal =
                    Paths.get(nombreOriginal)
                            .getFileName()
                            .toString();

            String extension =
                    obtenerExtension(nombreOriginal);

            if (
                    !EXTENSIONES_PERMITIDAS.contains(
                            extension.toLowerCase()
                    )
            ) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Tipo de archivo no permitido."
                );
            }

            /*
             * El archivo físico se guarda con UUID
             * para evitar nombres repetidos.
             */
            String nombreGuardado =
                    UUID.randomUUID()
                            + extension.toLowerCase();

            Path carpetaNormalizada =
                    carpetaAdjuntos
                            .toAbsolutePath()
                            .normalize();

            Files.createDirectories(
                    carpetaNormalizada
            );

            Path rutaFinal =
                    carpetaNormalizada
                            .resolve(nombreGuardado)
                            .normalize();

            /*
             * Protección contra path traversal.
             */
            if (
                    !rutaFinal.startsWith(
                            carpetaNormalizada
                    )
            ) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Ruta de archivo no válida."
                );
            }

            Files.copy(
                    archivo.getInputStream(),
                    rutaFinal
            );

            Adjunto adjunto =
                    Adjunto.builder()
                            .ticket(ticket)
                            .nombreArchivo(nombreOriginal)
                            .rutaArchivo(
                                    rutaFinal.toString()
                            )
                            .tipoArchivo(
                                    archivo.getContentType()
                            )
                            .tamanio(
                                    archivo.getSize()
                            )
                            .fechaSubida(
                                    LocalDateTime.now()
                            )
                            .build();

            Adjunto adjuntoGuardado =
                    adjuntoRepository.save(
                            adjunto
                    );

            return convertirADTO(
                    adjuntoGuardado
            );

        } catch (IOException error) {

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "No se pudo guardar el archivo."
            );
        }
    }

    /*
     * Descarga un archivo.
     *
     * No basta con conocer el ID del adjunto.
     * Primero se comprueba que el usuario
     * pueda acceder al ticket relacionado.
     */
    @GetMapping("/{id}/descargar")
    public ResponseEntity<Resource> descargarAdjunto(
            @PathVariable Integer id) {

        Adjunto adjunto =
                adjuntoRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Adjunto no encontrado."
                                )
                        );

        if (adjunto.getTicket() == null) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "El adjunto no tiene un ticket asociado."
            );
        }

        /*
         * Validamos el acceso antes de tocar
         * siquiera el archivo físico.
         */
        validarAccesoTicket(
                adjunto.getTicket()
        );

        try {

            Path rutaArchivo =
                    Paths.get(
                            adjunto.getRutaArchivo()
                    )
                            .toAbsolutePath()
                            .normalize();

            /*
             * Verificamos también que el archivo se
             * encuentre realmente dentro de uploads/adjuntos.
             */
            Path carpetaNormalizada =
                    carpetaAdjuntos
                            .toAbsolutePath()
                            .normalize();

            if (
                    !rutaArchivo.startsWith(
                            carpetaNormalizada
                    )
            ) {

                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "La ruta del archivo no es válida."
                );
            }

            Resource recurso =
                    new UrlResource(
                            rutaArchivo.toUri()
                    );

            if (
                    !recurso.exists()
                            || !recurso.isReadable()
            ) {

                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "El archivo no existe o no se puede leer."
                );
            }

            String tipoContenido =
                    adjunto.getTipoArchivo();

            if (
                    tipoContenido == null
                            || tipoContenido.isBlank()
            ) {

                tipoContenido =
                        "application/octet-stream";
            }

            return ResponseEntity
                    .ok()
                    .contentType(
                            MediaType.parseMediaType(
                                    tipoContenido
                            )
                    )
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            ContentDisposition
                                    .attachment()
                                    .filename(
                                            adjunto.getNombreArchivo()
                                    )
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

    /*
     * Centraliza la comprobación de acceso.
     *
     * Utiliza exactamente las mismas reglas
     * que ya configuramos para los tickets.
     */
    private void validarAccesoTicket(
            Ticket ticket) {

        Usuario usuario =
                accesoProyectoService
                        .obtenerUsuarioAutenticado();

        String rol =
                accesoProyectoService
                        .obtenerRol(usuario);

        accesoProyectoService
                .validarAccesoTicket(
                        usuario,
                        rol,
                        ticket
                );
    }

    private String obtenerExtension(
            String nombreArchivo) {

        int punto =
                nombreArchivo.lastIndexOf(".");

        if (punto == -1) {

            return "";
        }

        return nombreArchivo.substring(
                punto
        );
    }

    private AdjuntoResponse convertirADTO(
            Adjunto adjunto) {

        return new AdjuntoResponse(
                adjunto.getId(),
                adjunto.getTicket().getId(),
                adjunto.getNombreArchivo(),
                adjunto.getTipoArchivo(),
                adjunto.getTamanio(),
                adjunto.getFechaSubida(),
                "/api/adjuntos/"
                        + adjunto.getId()
                        + "/descargar"
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