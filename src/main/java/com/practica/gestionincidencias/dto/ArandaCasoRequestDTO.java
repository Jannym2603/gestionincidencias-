package com.practica.gestionincidencias.dto;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ArandaCasoRequestDTO {

    private Integer applicantId;
    private Integer authorId;
    private Integer categoryId;
    private Integer consoleType;
    private String description;
    private Integer itemType;
    private Integer modelId;
    private Integer projectId;
    private Integer serviceId;
    private Integer stateId;
    private String subject;
    private Integer tempItemId;

    @JsonProperty("listAdditionalField")
    private List<Object> listAdditionalField =
            new ArrayList<>();

    public Integer getApplicantId() {
        return applicantId;
    }

    public void setApplicantId(
            Integer applicantId) {

        this.applicantId = applicantId;
    }

    public Integer getAuthorId() {
        return authorId;
    }

    public void setAuthorId(Integer authorId) {
        this.authorId = authorId;
    }

    public Integer getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(
            Integer categoryId) {

        this.categoryId = categoryId;
    }

    public Integer getConsoleType() {
        return consoleType;
    }

    public void setConsoleType(
            Integer consoleType) {

        this.consoleType = consoleType;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(
            String description) {

        this.description = description;
    }

    public Integer getItemType() {
        return itemType;
    }

    public void setItemType(
            Integer itemType) {

        this.itemType = itemType;
    }

    public Integer getModelId() {
        return modelId;
    }

    public void setModelId(
            Integer modelId) {

        this.modelId = modelId;
    }

    public Integer getProjectId() {
        return projectId;
    }

    public void setProjectId(
            Integer projectId) {

        this.projectId = projectId;
    }

    public Integer getServiceId() {
        return serviceId;
    }

    public void setServiceId(
            Integer serviceId) {

        this.serviceId = serviceId;
    }

    public Integer getStateId() {
        return stateId;
    }

    public void setStateId(
            Integer stateId) {

        this.stateId = stateId;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(
            String subject) {

        this.subject = subject;
    }

    public Integer getTempItemId() {
        return tempItemId;
    }

    public void setTempItemId(
            Integer tempItemId) {

        this.tempItemId = tempItemId;
    }

    public List<Object> getListAdditionalField() {
        return listAdditionalField;
    }

    public void setListAdditionalField(
            List<Object> listAdditionalField) {

        this.listAdditionalField =
                listAdditionalField != null
                        ? listAdditionalField
                        : new ArrayList<>();
    }
}