package com.practica.gestionincidencias.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CambiarPasswordRequestDTO {

    @NotBlank(message = "La contraseña actual es obligatoria.")
    private String passwordActual;

    @NotBlank(message = "La nueva contraseña es obligatoria.")
    @Size(
            min = 6,
            message = "La nueva contraseña debe tener al menos 6 caracteres."
    )
    private String nuevaPassword;

    public CambiarPasswordRequestDTO() {
    }

    public String getPasswordActual() {
        return passwordActual;
    }

    public void setPasswordActual(
            String passwordActual) {

        this.passwordActual = passwordActual;
    }

    public String getNuevaPassword() {
        return nuevaPassword;
    }

    public void setNuevaPassword(
            String nuevaPassword) {

        this.nuevaPassword = nuevaPassword;
    }
}
