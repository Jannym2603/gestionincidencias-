package com.practica.gestionincidencias.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class ArandaCasoResponseDTO {

    private Long id;

    private String idByProject;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getIdByProject() {
        return idByProject;
    }

    public void setIdByProject(
            String idByProject) {

        this.idByProject = idByProject;
    }
}