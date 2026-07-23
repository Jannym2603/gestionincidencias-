package com.practica.gestionincidencias.config;

import java.time.Duration;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class ArandaHttpConfig {

    private final ArandaProperties arandaProperties;

    public ArandaHttpConfig(
            ArandaProperties arandaProperties) {

        this.arandaProperties = arandaProperties;
    }

    @Bean
    public RestTemplate arandaRestTemplate(
            RestTemplateBuilder builder) {

        int connectTimeout =
                arandaProperties.getConnectTimeoutSeconds();

        int readTimeout =
                arandaProperties.getReadTimeoutSeconds();

        return builder
                .connectTimeout(
                        Duration.ofSeconds(connectTimeout)
                )
                .readTimeout(
                        Duration.ofSeconds(readTimeout)
                )
                .build();
    }
}