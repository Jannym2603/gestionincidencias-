package com.practica.gestionincidencias;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
        "app.jwt.secret=clave-jwt-exclusiva-para-pruebas-1234567890",
        "app.jwt.expiration-ms=28800000"
})
class GestionincidenciasApplicationTests {

    @Test
    void contextLoads() {
    }
}
