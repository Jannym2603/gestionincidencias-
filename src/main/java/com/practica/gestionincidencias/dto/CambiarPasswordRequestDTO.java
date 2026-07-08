package com.practica.gestionincidencias.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CambiarPasswordRequestDTO {

    @NotBlank(message = "El correo es obligatorio.")
    @Email(message = "El correo no tiene un formato valido.")
    private String correo;

    @NotBlank(message = "La nueva contrasena es obligatoria.")
    @Size(min = 6, message = "La nueva contrasena debe tener al menos 6 caracteres.")
    private String nuevaPassword;

    public CambiarPasswordRequestDTO() {
    }

    public String getCorreo() {
        return correo;
    }

    public void setCorreo(String correo) {
        this.correo = correo;
    }

    public String getNuevaPassword() {
        return nuevaPassword;
    }

    public void setNuevaPassword(String nuevaPassword) {
        this.nuevaPassword = nuevaPassword;
    }
}