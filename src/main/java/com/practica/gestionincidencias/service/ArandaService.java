package com.practica.gestionincidencias.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import com.practica.gestionincidencias.config.ArandaProperties;
import com.practica.gestionincidencias.dto.ArandaCasoRequestDTO;
import com.practica.gestionincidencias.dto.ArandaCasoResponseDTO;
import com.practica.gestionincidencias.entity.IntegracionAranda;
import com.practica.gestionincidencias.entity.Ticket;
import com.practica.gestionincidencias.entity.Usuario;
import com.practica.gestionincidencias.repository.IntegracionArandaRepository;
import com.practica.gestionincidencias.repository.TicketRepository;

@Service
public class ArandaService {

    private final RestTemplate arandaRestTemplate;
    private final ArandaProperties arandaProperties;
    private final TicketRepository ticketRepository;
    private final IntegracionArandaRepository integracionArandaRepository;

    public ArandaService(
            RestTemplate arandaRestTemplate,
            ArandaProperties arandaProperties,
            TicketRepository ticketRepository,
            IntegracionArandaRepository integracionArandaRepository) {

        this.arandaRestTemplate = arandaRestTemplate;
        this.arandaProperties = arandaProperties;
        this.ticketRepository = ticketRepository;
        this.integracionArandaRepository = integracionArandaRepository;
    }

    @Transactional
    public IntegracionAranda enviarTicketAAranda(
            Integer ticketId) {

        validarConfiguracion();

        if (integracionArandaRepository.existsByTicketId(ticketId)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Este ticket ya fue enviado a Aranda"
            );
        }

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No se encontró el ticket con ID " + ticketId
                ));

        ArandaCasoRequestDTO solicitud =
                construirSolicitud(ticket);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        headers.set(
                "X-Authorization",
                "Bearer " + arandaProperties.getToken().trim()
        );

        HttpEntity<ArandaCasoRequestDTO> peticion =
                new HttpEntity<>(solicitud, headers);

        String url = construirUrlCreacion();

        try {
            ResponseEntity<ArandaCasoResponseDTO> respuesta =
                    arandaRestTemplate.postForEntity(
                            url,
                            peticion,
                            ArandaCasoResponseDTO.class
                    );

            ArandaCasoResponseDTO cuerpo =
                    respuesta.getBody();

            if (cuerpo == null
                    || cuerpo.getId() == null) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Aranda no devolvió un identificador de caso válido"
                );
            }

            LocalDateTime ahora =
                    LocalDateTime.now();

            IntegracionAranda integracion =
                    new IntegracionAranda();

            integracion.setTicket(ticket);
            integracion.setArandaItemId(
                    cuerpo.getId()
            );

            integracion.setArandaIdProyecto(
                    cuerpo.getIdByProject() != null
                            && !cuerpo.getIdByProject().isBlank()
                            ? cuerpo.getIdByProject()
                            : String.valueOf(cuerpo.getId())
            );

            integracion.setEstadoSincronizacion(
                    "SINCRONIZADO"
            );

            integracion.setFechaCreacionAranda(
                    ahora
            );

            integracion.setFechaUltimaSincronizacion(
                    ahora
            );

            integracion.setUltimoError(null);

            return integracionArandaRepository.save(
                    integracion
            );

        } catch (HttpStatusCodeException error) {

            String cuerpoError =
                    error.getResponseBodyAsString();

            String mensaje =
                    "Aranda respondió con estado "
                            + error.getStatusCode().value();

            if (cuerpoError != null
                    && !cuerpoError.isBlank()) {

                mensaje += ": " + cuerpoError;
            }

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    mensaje,
                    error
            );

        } catch (RestClientException error) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "No fue posible conectarse con Aranda: "
                            + error.getMessage(),
                    error
            );
        }
    }

    @Transactional(readOnly = true)
    public IntegracionAranda consultarPorTicket(
            Integer ticketId) {

        if (!ticketRepository.existsById(ticketId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "No se encontró el ticket con ID " + ticketId
            );
        }

        return integracionArandaRepository
                .findByTicketId(ticketId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "El ticket todavía no está sincronizado con Aranda"
                ));
    }

    private ArandaCasoRequestDTO construirSolicitud(
            Ticket ticket) {

        ArandaCasoRequestDTO solicitud =
                new ArandaCasoRequestDTO();

        solicitud.setApplicantId(
                valorPositivoONull(
                        arandaProperties.getApplicantId()
                )
        );

        solicitud.setAuthorId(
                valorPositivoONull(
                        arandaProperties.getAuthorId()
                )
        );

        solicitud.setCategoryId(
                arandaProperties.getCategoryId()
        );

        solicitud.setConsoleType(
                arandaProperties.getConsoleType()
        );

        solicitud.setItemType(
                arandaProperties.getItemType()
        );

        solicitud.setModelId(
                arandaProperties.getModelId()
        );

        solicitud.setProjectId(
                arandaProperties.getProjectId()
        );

        solicitud.setServiceId(
                arandaProperties.getServiceId()
        );

        solicitud.setStateId(
                arandaProperties.getStateId()
        );

        solicitud.setSubject(
                construirAsunto(ticket)
        );

        solicitud.setDescription(
                construirDescripcion(ticket)
        );

        solicitud.setTempItemId(-1);

        solicitud.setListAdditionalField(
                List.of()
        );

        return solicitud;
    }

    private String construirAsunto(
            Ticket ticket) {

        String numeroTicket =
                textoOValorPredeterminado(
                        ticket.getNumeroTicket(),
                        "Ticket " + ticket.getId()
                );

        String titulo =
                textoOValorPredeterminado(
                        ticket.getTitulo(),
                        "Sin título"
                );

        String asunto =
                numeroTicket + " - " + titulo;

        if (asunto.length() > 150) {
            return asunto.substring(0, 150);
        }

        return asunto;
    }

    private String construirDescripcion(
            Ticket ticket) {

        String cliente =
                obtenerNombreCompleto(
                        ticket.getCliente()
                );

        String agente =
                ticket.getAgenteAsignado() != null
                        ? obtenerNombreCompleto(
                                ticket.getAgenteAsignado()
                        )
                        : "Sin asignar";

        String tipoIncidencia =
                ticket.getTipoIncidencia() != null
                        && ticket.getTipoIncidencia().getNombre() != null
                        ? ticket.getTipoIncidencia()
                                .getNombre()
                                .trim()
                        : "Sin categoría";

        String descripcion =
                textoOValorPredeterminado(
                        ticket.getDescripcion(),
                        "Sin descripción"
                );

        return """
                Ticket creado desde el sistema Gestión de Incidencias.

                Número local: %s
                Título: %s
                Cliente: %s
                Agente asignado: %s
                Tipo de incidencia: %s
                Estado: %s
                Prioridad: %s
                Severidad: %s
                Criticidad: %s
                Impacto: %s
                Urgencia: %s

                Descripción:
                %s
                """.formatted(
                textoOValorPredeterminado(
                        ticket.getNumeroTicket(),
                        String.valueOf(ticket.getId())
                ),
                textoOValorPredeterminado(
                        ticket.getTitulo(),
                        "Sin título"
                ),
                cliente,
                agente,
                tipoIncidencia,
                textoOValorPredeterminado(
                        ticket.getEstado(),
                        "Sin estado"
                ),
                textoOValorPredeterminado(
                        ticket.getPrioridad(),
                        "Sin prioridad"
                ),
                textoOValorPredeterminado(
                        ticket.getSeveridad(),
                        "No definida"
                ),
                textoOValorPredeterminado(
                        ticket.getCriticidad(),
                        "No definida"
                ),
                textoOValorPredeterminado(
                        ticket.getImpacto(),
                        "No definido"
                ),
                textoOValorPredeterminado(
                        ticket.getUrgencia(),
                        "No definida"
                ),
                descripcion
        );
    }

    private String obtenerNombreCompleto(
            Usuario usuario) {

        if (usuario == null) {
            return "Sin información";
        }

        String nombre =
                textoOValorPredeterminado(
                        usuario.getNombre(),
                        ""
                );

        String apellido =
                textoOValorPredeterminado(
                        usuario.getApellido(),
                        ""
                );

        String nombreCompleto =
                (nombre + " " + apellido).trim();

        return nombreCompleto.isBlank()
                ? "Sin información"
                : nombreCompleto;
    }

    private String textoOValorPredeterminado(
            String valor,
            String valorPredeterminado) {

        if (valor == null || valor.isBlank()) {
            return valorPredeterminado;
        }

        return valor.trim();
    }

    private Integer valorPositivoONull(
            Integer valor) {

        return valor != null && valor > 0
                ? valor
                : null;
    }

    private void validarConfiguracion() {

        if (!arandaProperties.isEnabled()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "La integración con Aranda está desactivada"
            );
        }

        validarTexto(
                arandaProperties.getUrl(),
                "ARANDA_API_URL"
        );

        validarTexto(
                arandaProperties.getToken(),
                "ARANDA_API_TOKEN"
        );

        validarId(
                arandaProperties.getProjectId(),
                "ARANDA_PROJECT_ID"
        );

        validarId(
                arandaProperties.getServiceId(),
                "ARANDA_SERVICE_ID"
        );

        validarId(
                arandaProperties.getCategoryId(),
                "ARANDA_CATEGORY_ID"
        );

        validarId(
                arandaProperties.getModelId(),
                "ARANDA_MODEL_ID"
        );

        validarId(
                arandaProperties.getStateId(),
                "ARANDA_STATE_ID"
        );

        validarId(
                arandaProperties.getItemType(),
                "ARANDA_ITEM_TYPE"
        );

        validarId(
                arandaProperties.getConsoleType(),
                "ARANDA_CONSOLE_TYPE"
        );
    }

    private void validarTexto(
            String valor,
            String variable) {

        if (valor == null || valor.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Falta configurar " + variable
            );
        }
    }

    private void validarId(
            Integer valor,
            String variable) {

        if (valor == null || valor <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Falta configurar " + variable
            );
        }
    }

    private String construirUrlCreacion() {

        String urlBase =
                arandaProperties.getUrl().trim();

        while (urlBase.endsWith("/")) {
            urlBase = urlBase.substring(
                    0,
                    urlBase.length() - 1
            );
        }

        if (urlBase.toLowerCase()
                .endsWith("/asmsapi")) {

            return urlBase + "/api/v9/item";
        }

        return urlBase
                + "/ASMSAPI/api/v9/item";
    }
}