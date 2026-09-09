package com.practica.gestionincidencias.service;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import com.practica.gestionincidencias.entity.Comentario;
import com.practica.gestionincidencias.entity.EnlaceCompartido;
import com.practica.gestionincidencias.entity.SolicitudRecurso;
import com.practica.gestionincidencias.entity.Ticket;
import com.practica.gestionincidencias.entity.Usuario;

@Service
public class NotificacionService {

    private final JavaMailSender mailSender;
    private final String correoSoporte;
    private final boolean enviarCopiaSoporte;

    public NotificacionService(
            ObjectProvider<JavaMailSender> mailSenderProvider,
            @Value("${app.mail.soporte:${spring.mail.username:}}") String correoSoporte,
            @Value("${app.mail.enviar-copia-soporte:false}") boolean enviarCopiaSoporte) {

        this.mailSender = mailSenderProvider.getIfAvailable();
        this.correoSoporte = correoSoporte;
        this.enviarCopiaSoporte = enviarCopiaSoporte;
    }

    public void notificarTicketCreado(Ticket ticket) {
        enviar(
                ticket.getCliente().getCorreo(),
                "Ticket creado: " + ticket.getNumeroTicket(),
                "Tu ticket fue creado correctamente.\n\n"
                        + "Número: " + ticket.getNumeroTicket() + "\n"
                        + "Título: " + ticket.getTitulo() + "\n"
                        + "Estado: " + ticket.getEstado() + "\n"
                        + "Prioridad recomendada: " + ticket.getPrioridad()
        );
    }

    public void notificarTicketAsignado(
            Ticket ticket,
            Usuario agente) {

        String nombreAgente =
                agente.getNombre() + " " + agente.getApellido();

        enviar(
                ticket.getCliente().getCorreo(),
                "Ticket asignado: " + ticket.getNumeroTicket(),
                "Tu ticket fue asignado a un agente.\n\n"
                        + "Número: " + ticket.getNumeroTicket() + "\n"
                        + "Título: " + ticket.getTitulo() + "\n"
                        + "Estado actual: " + ticket.getEstado() + "\n"
                        + "Agente asignado: " + nombreAgente
        );

        enviar(
                agente.getCorreo(),
                "Nuevo ticket asignado: " + ticket.getNumeroTicket(),
                "Se te asignó un nuevo ticket.\n\n"
                        + "Número: " + ticket.getNumeroTicket() + "\n"
                        + "Título: " + ticket.getTitulo() + "\n"
                        + "Cliente: "
                        + ticket.getCliente().getNombre()
                        + " "
                        + ticket.getCliente().getApellido()
                        + "\n"
                        + "Prioridad: " + ticket.getPrioridad() + "\n"
                        + "Estado actual: " + ticket.getEstado()
        );
    }

    public void notificarCambioEstado(
            Ticket ticket,
            String estadoAnterior,
            String nuevoEstado,
            String notaResolucion) {

        String contenido =
                "Tu ticket cambió de estado.\n\n"
                        + "Número: " + ticket.getNumeroTicket() + "\n"
                        + "Título: " + ticket.getTitulo() + "\n"
                        + "Estado anterior: " + estadoAnterior + "\n"
                        + "Estado actual: " + nuevoEstado;

        if (notaResolucion != null
                && !notaResolucion.isBlank()) {

            contenido += "\n\nNota: " + notaResolucion;
        }

        enviar(
                ticket.getCliente().getCorreo(),
                "Actualización de estado: "
                        + ticket.getNumeroTicket(),
                contenido
        );
    }

    public void notificarTicketResueltoOCerrado(
            Ticket ticket,
            String notaResolucion) {

        enviar(
                ticket.getCliente().getCorreo(),
                "Ticket "
                        + ticket.getEstado().toLowerCase()
                        + ": "
                        + ticket.getNumeroTicket(),
                "El ticket "
                        + ticket.getNumeroTicket()
                        + " cambió a estado "
                        + ticket.getEstado()
                        + ".\n\n"
                        + "Nota de resolución: "
                        + notaResolucion
        );
    }

    public void notificarComentarioPublico(
            Comentario comentario) {

        Ticket ticket = comentario.getTicket();

        enviar(
                ticket.getCliente().getCorreo(),
                "Nuevo comentario en "
                        + ticket.getNumeroTicket(),
                "Se agregó un comentario público al ticket "
                        + ticket.getNumeroTicket()
                        + ".\n\n"
                        + comentario.getContenido()
        );
    }

    /*
     * Notifica al cliente cuando una solicitud de recurso cambia
     * a un estado relevante para su seguimiento.
     *
     * No se envían correos por cambios administrativos menores
     * como categoría, cantidad, proveedor u observaciones.
     */
    public void notificarCambioEstadoRecurso(
            SolicitudRecurso solicitud,
            String estadoAnterior,
            String nuevoEstado) {

        if (solicitud == null
                || solicitud.getTicket() == null
                || solicitud.getTicket().getCliente() == null) {

            return;
        }

        Ticket ticket =
                solicitud.getTicket();

        String destinatario =
                ticket.getCliente().getCorreo();

        if (destinatario == null
                || destinatario.isBlank()) {

            return;
        }

        String estado =
                nuevoEstado == null
                        ? ""
                        : nuevoEstado.trim().toUpperCase();

        String asunto;
        String mensajeEstado;

        switch (estado) {

            case "EN_VALIDACION" -> {
                asunto =
                        "Solicitud de recurso en validación: "
                                + ticket.getNumeroTicket();

                mensajeEstado =
                        "Tu solicitud de recurso se encuentra en proceso de validación.";
            }

            case "SOLICITADO_PROVEEDOR" -> {
                asunto =
                        "Recurso solicitado al proveedor: "
                                + ticket.getNumeroTicket();

                mensajeEstado =
                        "El recurso requerido ya fue solicitado al proveedor.";
            }

            case "ESPERANDO_PROVEEDOR" -> {
                asunto =
                        "Recurso en espera del proveedor: "
                                + ticket.getNumeroTicket();

                mensajeEstado =
                        "La solicitud está a la espera de la entrega por parte del proveedor.";
            }

            case "RECIBIDO" -> {
                asunto =
                        "Recurso recibido: "
                                + ticket.getNumeroTicket();

                mensajeEstado =
                        "El recurso fue recibido del proveedor y continuará con el proceso de entrega.";
            }

            case "ENTREGADO" -> {
                asunto =
                        "Recurso entregado: "
                                + ticket.getNumeroTicket();

                mensajeEstado =
                        "El recurso asociado a tu solicitud fue registrado como entregado.";
            }

            case "CERRADO" -> {
                asunto =
                        "Solicitud de recurso cerrada: "
                                + ticket.getNumeroTicket();

                mensajeEstado =
                        "La solicitud de recurso fue cerrada correctamente.";
            }

            case "CANCELADO" -> {
                asunto =
                        "Solicitud de recurso cancelada: "
                                + ticket.getNumeroTicket();

                mensajeEstado =
                        "La solicitud de recurso fue cancelada.";
            }

            default -> {
                /*
                 * NUEVO y cualquier estado no contemplado no generan
                 * correo para evitar notificaciones innecesarias.
                 */
                return;
            }
        }

        String contenido =
                mensajeEstado
                        + "\n\n"
                        + "Ticket: "
                        + ticket.getNumeroTicket()
                        + "\n"
                        + "Título: "
                        + ticket.getTitulo()
                        + "\n"
                        + "Recurso: "
                        + valorCorreo(
                                solicitud.getRecurso(),
                                "Sin especificar"
                        )
                        + "\n"
                        + "Cantidad: "
                        + (
                                solicitud.getCantidad() != null
                                        ? solicitud.getCantidad()
                                        : 1
                        )
                        + "\n"
                        + "Estado anterior: "
                        + valorCorreo(
                                estadoAnterior,
                                "-"
                        )
                        + "\n"
                        + "Estado actual: "
                        + valorCorreo(
                                nuevoEstado,
                                "-"
                        );

        if (solicitud.getFechaEstimadaEntrega() != null) {

            contenido +=
                    "\n"
                            + "Fecha estimada de entrega: "
                            + solicitud.getFechaEstimadaEntrega();
        }

        enviar(
                destinatario,
                asunto,
                contenido
        );
    }


    /*
     * Alerta interna de retraso. Se envía una sola vez por fecha estimada
     * vencida; el servicio programado registra la fecha de notificación
     * únicamente cuando el correo se envía correctamente.
     */
    public boolean notificarRecursoRetrasado(
            SolicitudRecurso solicitud) {

        if (solicitud == null
                || solicitud.getTicket() == null
                || correoSoporte == null
                || correoSoporte.isBlank()) {

            return false;
        }

        Ticket ticket =
                solicitud.getTicket();

        String cliente =
                ticket.getCliente() != null
                        ? obtenerNombreUsuario(ticket.getCliente())
                        : "Sin cliente";

        String proyecto =
                ticket.getProyecto() != null
                        ? ticket.getProyecto().getNombre()
                        : "Sin proyecto";

        String contenido =
                "Se detectó una solicitud de recurso con entrega vencida.\n\n"
                        + "Ticket: "
                        + valorCorreo(ticket.getNumeroTicket(), "-")
                        + "\n"
                        + "Título: "
                        + valorCorreo(ticket.getTitulo(), "-")
                        + "\n"
                        + "Cliente: "
                        + cliente
                        + "\n"
                        + "Proyecto: "
                        + proyecto
                        + "\n"
                        + "Recurso: "
                        + valorCorreo(solicitud.getRecurso(), "-")
                        + "\n"
                        + "Cantidad: "
                        + valorCorreo(solicitud.getCantidad(), "1")
                        + "\n"
                        + "Proveedor: "
                        + valorCorreo(solicitud.getProveedor(), "Pendiente")
                        + "\n"
                        + "Estado del recurso: "
                        + valorCorreo(solicitud.getEstadoRecurso(), "NUEVO")
                        + "\n"
                        + "Fecha estimada de entrega: "
                        + valorCorreo(solicitud.getFechaEstimadaEntrega(), "-")
                        + "\n\n"
                        + "La solicitud continúa con su estado real; RETRASADO "
                        + "es únicamente una condición de seguimiento.";

        return enviarSinCopiaSoporte(
                correoSoporte,
                "ALERTA: recurso retrasado - "
                        + valorCorreo(ticket.getNumeroTicket(), "Ticket"),
                contenido
        );
    }


    private String valorCorreo(
            Object valor,
            String defecto) {

        if (valor == null) {
            return defecto;
        }

        String texto =
                String.valueOf(valor).trim();

        return texto.isBlank()
                ? defecto
                : texto;
    }


    public void notificarCodigoRecuperacionPassword(
            Usuario usuario,
            String codigo) {

        enviarSinCopiaSoporte(
                usuario.getCorreo(),
                "Código para restablecer tu contraseña",
                "Hola " + usuario.getNombre() + ",\n\n"
                        + "Recibimos una solicitud para restablecer "
                        + "tu contraseña.\n\n"
                        + "Tu código de recuperación es: "
                        + codigo
                        + "\n\n"
                        + "Este código vence en 10 minutos.\n\n"
                        + "Si no solicitaste este cambio, "
                        + "puedes ignorar este mensaje."
        );
    }

    /*
     * Envía por correo el enlace compartido del ticket.
     */
    public void notificarEnlaceCompartido(
            EnlaceCompartido enlace,
            String urlCompartida) {

        Ticket ticket = enlace.getTicket();

        String permisos =
                construirPermisosEnlace(enlace);

        String expiracion =
                enlace.getFechaExpiracion() != null
                        ? formatearFechaExpiracion(enlace)
                        : "Sin fecha de vencimiento";

        String nombreCreador =
                obtenerNombreUsuario(enlace.getCreadoPor());

        enviarSinCopiaSoporte(
                enlace.getCorreoDestinatario(),
                "Ticket compartido: "
                        + ticket.getNumeroTicket(),
                "Hola,\n\n"
                        + nombreCreador
                        + " compartió contigo un ticket del "
                        + "sistema de gestión de incidencias.\n\n"
                        + "Número: "
                        + ticket.getNumeroTicket()
                        + "\n"
                        + "Título: "
                        + ticket.getTitulo()
                        + "\n"
                        + "Estado actual: "
                        + ticket.getEstado()
                        + "\n"
                        + "Prioridad: "
                        + ticket.getPrioridad()
                        + "\n"
                        + "Permisos autorizados: "
                        + permisos
                        + "\n"
                        + "Vencimiento: "
                        + expiracion
                        + "\n\n"
                        + "Abre el ticket desde el siguiente enlace:\n"
                        + urlCompartida
                        + "\n\n"
                        + "Este enlace es personal. "
                        + "No lo compartas con otras personas."
        );
    }

    /*
     * Construye el texto de permisos que se enviará por correo.
     */
    private String construirPermisosEnlace(
            EnlaceCompartido enlace) {

        StringBuilder permisos =
                new StringBuilder();

        if (Boolean.TRUE.equals(enlace.getPuedeVer())) {
            agregarPermiso(permisos, "ver el ticket");
        }

        if (Boolean.TRUE.equals(enlace.getPuedeComentar())) {
            agregarPermiso(
                    permisos,
                    "agregar comentarios"
            );
        }

        if (Boolean.TRUE.equals(
                enlace.getPuedeVerAdjuntos())) {

            agregarPermiso(
                    permisos,
                    "ver adjuntos"
            );
        }

        if (Boolean.TRUE.equals(
                enlace.getPuedeSubirAdjuntos())) {

            agregarPermiso(
                    permisos,
                    "subir adjuntos"
            );
        }

        if (Boolean.TRUE.equals(
                enlace.getPuedeCambiarEstado())) {

            agregarPermiso(
                    permisos,
                    "cambiar el estado"
            );
        }

        if (permisos.length() == 0) {
            return "Sin permisos disponibles";
        }

        return permisos.toString();
    }

    private void agregarPermiso(
            StringBuilder permisos,
            String permiso) {

        if (permisos.length() > 0) {
            permisos.append(", ");
        }

        permisos.append(permiso);
    }

    private String obtenerNombreUsuario(
            Usuario usuario) {

        if (usuario == null) {
            return "Un usuario";
        }

        String nombre =
                usuario.getNombre() != null
                        ? usuario.getNombre().trim()
                        : "";

        String apellido =
                usuario.getApellido() != null
                        ? usuario.getApellido().trim()
                        : "";

        String nombreCompleto =
                (nombre + " " + apellido).trim();

        return nombreCompleto.isBlank()
                ? "Un usuario"
                : nombreCompleto;
    }

    private String formatearFechaExpiracion(
            EnlaceCompartido enlace) {

        if (enlace.getFechaExpiracion() == null) {
            return "Sin fecha de vencimiento";
        }

        return enlace.getFechaExpiracion()
                .toLocalDate()
                + " "
                + enlace.getFechaExpiracion()
                .toLocalTime()
                .withSecond(0)
                .withNano(0);
    }

    private boolean enviar(
            String destinatario,
            String asunto,
            String contenido) {

        return enviar(
                destinatario,
                asunto,
                contenido,
                true
        );
    }

    private boolean enviarSinCopiaSoporte(
            String destinatario,
            String asunto,
            String contenido) {

        return enviar(
                destinatario,
                asunto,
                contenido,
                false
        );
    }

    private boolean enviar(
            String destinatario,
            String asunto,
            String contenido,
            boolean copiarSoporte) {

        if (mailSender == null
                || destinatario == null
                || destinatario.isBlank()) {

            System.err.println(
                    "No se envió correo: falta configuración "
                            + "de correo o destinatario."
            );

            return false;
        }

        SimpleMailMessage mensaje =
                new SimpleMailMessage();

        if (correoSoporte != null
                && !correoSoporte.isBlank()) {

            mensaje.setFrom(correoSoporte);
            mensaje.setReplyTo(correoSoporte);
        }

        mensaje.setTo(destinatario);

        if (copiarSoporte) {
            agregarCopiaSoporteSiAplica(
                    mensaje,
                    destinatario
            );
        }

        mensaje.setSubject(asunto);
        mensaje.setText(contenido);

        try {
            mailSender.send(mensaje);

            System.out.println(
                    "Correo enviado a "
                            + destinatario
                            + " con asunto: "
                            + asunto
            );

            return true;

        } catch (RuntimeException error) {

            System.err.println(
                    "No se pudo enviar la notificación "
                            + "por correo: "
                            + error.getMessage()
            );

            return false;
        }
    }

    private void agregarCopiaSoporteSiAplica(
            SimpleMailMessage mensaje,
            String destinatario) {

        if (!enviarCopiaSoporte
                || correoSoporte == null
                || correoSoporte.isBlank()) {

            return;
        }

        if (correoSoporte.equalsIgnoreCase(
                destinatario)) {

            return;
        }

        mensaje.setBcc(correoSoporte);
    }
}