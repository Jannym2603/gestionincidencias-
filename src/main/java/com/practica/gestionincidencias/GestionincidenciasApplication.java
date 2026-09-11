package com.practica.gestionincidencias;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(
        exclude = UserDetailsServiceAutoConfiguration.class
)
@EnableScheduling
public class GestionincidenciasApplication {

    public static void main(String[] args) {
        SpringApplication.run(GestionincidenciasApplication.class, args);
    }
}