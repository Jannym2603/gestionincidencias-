package com.practica.gestionincidencias.service;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import com.practica.gestionincidencias.entity.Comentario;
import com.practica.gestionincidencias.entity.Ticket;
import com.practica.gestionincidencias.entity.Usuario;

@Service
public class NotificacionService {

    private final JavaMailSender mailSender;
    private final String correoSoporte;
    private final boolean enviarCopiaSoporte;

    public NotificacionService(ObjectProvider<JavaMailSender> mailSenderProvider,
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
                        + "Numero: " + ticket.getNumeroTicket() + "\n"
                        + "Titulo: " + ticket.getTitulo() + "\n"
                        + "Estado: " + ticket.getEstado() + "\n"
                        + "Prioridad recomendada: " + ticket.getPrioridad()
        );
    }

    public void notificarTicketAsignado(Ticket ticket, Usuario agente) {
        String nombreAgente = agente.getNombre() + " " + agente.getApellido();

        enviar(
                ticket.getCliente().getCorreo(),
                "Ticket asignado: " + ticket.getNumeroTicket(),
                "Tu ticket fue asignado a un agente.\n\n"
                        + "Numero: " + ticket.getNumeroTicket() + "\n"
                        + "Titulo: " + ticket.getTitulo() + "\n"
                        + "Estado actual: " + ticket.getEstado() + "\n"
                        + "Agente asignado: " + nombreAgente
        );

        enviar(
                agente.getCorreo(),
                "Nuevo ticket asignado: " + ticket.getNumeroTicket(),
                "Se te asigno un nuevo ticket.\n\n"
                        + "Numero: " + ticket.getNumeroTicket() + "\n"
                        + "Titulo: " + ticket.getTitulo() + "\n"
                        + "Cliente: " + ticket.getCliente().getNombre() + " " + ticket.getCliente().getApellido() + "\n"
                        + "Prioridad: " + ticket.getPrioridad() + "\n"
                        + "Estado actual: " + ticket.getEstado()
        );
    }

    public void notificarCambioEstado(Ticket ticket, String estadoAnterior, String nuevoEstado, String notaResolucion) {
        String contenido = "Tu ticket cambio de estado.\n\n"
                + "Numero: " + ticket.getNumeroTicket() + "\n"
                + "Titulo: " + ticket.getTitulo() + "\n"
                + "Estado anterior: " + estadoAnterior + "\n"
                + "Estado actual: " + nuevoEstado;

        if (notaResolucion != null && !notaResolucion.isBlank()) {
            contenido += "\n\nNota: " + notaResolucion;
        }

        enviar(
                ticket.getCliente().getCorreo(),
                "Actualizacion de estado: " + ticket.getNumeroTicket(),
                contenido
        );
    }

    public void notificarTicketResueltoOCerrado(Ticket ticket, String notaResolucion) {
        enviar(
                ticket.getCliente().getCorreo(),
                "Ticket " + ticket.getEstado().toLowerCase() + ": " + ticket.getNumeroTicket(),
                "El ticket " + ticket.getNumeroTicket() + " cambio a estado " + ticket.getEstado() + ".\n\n"
                        + "Nota de resolucion: " + notaResolucion
        );
    }

    public void notificarComentarioPublico(Comentario comentario) {
        Ticket ticket = comentario.getTicket();

        enviar(
                ticket.getCliente().getCorreo(),
                "Nuevo comentario en " + ticket.getNumeroTicket(),
                "Se agrego un comentario publico al ticket " + ticket.getNumeroTicket() + ".\n\n"
                        + comentario.getContenido()
        );
    }

    public void notificarCodigoRecuperacionPassword(Usuario usuario, String codigo) {
        enviarSinCopiaSoporte(
                usuario.getCorreo(),
                "Codigo para restablecer tu contrasena",
                "Hola " + usuario.getNombre() + ",\n\n"
                        + "Recibimos una solicitud para restablecer tu contrasena.\n\n"
                        + "Tu codigo de recuperacion es: " + codigo + "\n\n"
                        + "Este codigo vence en 10 minutos.\n\n"
                        + "Si no solicitaste este cambio, puedes ignorar este mensaje."
        );
    }

    private void enviar(String destinatario, String asunto, String contenido) {
        enviar(destinatario, asunto, contenido, true);
    }

    private void enviarSinCopiaSoporte(String destinatario, String asunto, String contenido) {
        enviar(destinatario, asunto, contenido, false);
    }

    private void enviar(String destinatario, String asunto, String contenido, boolean copiarSoporte) {
        if (mailSender == null || destinatario == null || destinatario.isBlank()) {
            System.err.println("No se envio correo: falta configuracion de correo o destinatario.");
            return;
        }

        SimpleMailMessage mensaje = new SimpleMailMessage();
        mensaje.setFrom(correoSoporte);
        mensaje.setReplyTo(correoSoporte);
        mensaje.setTo(destinatario);
        if (copiarSoporte) {
            agregarCopiaSoporteSiAplica(mensaje, destinatario);
        }
        mensaje.setSubject(asunto);
        mensaje.setText(contenido);

        try {
            mailSender.send(mensaje);
            System.out.println("Correo enviado a " + destinatario + " con asunto: " + asunto);
        } catch (RuntimeException error) {
            System.err.println("No se pudo enviar la notificacion por correo: " + error.getMessage());
        }
    }

    private void agregarCopiaSoporteSiAplica(SimpleMailMessage mensaje, String destinatario) {
        if (!enviarCopiaSoporte || correoSoporte == null || correoSoporte.isBlank()) {
            return;
        }

        if (correoSoporte.equalsIgnoreCase(destinatario)) {
            return;
        }

        mensaje.setBcc(correoSoporte);
    }
}
