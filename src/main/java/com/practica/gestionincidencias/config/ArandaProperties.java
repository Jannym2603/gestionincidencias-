package com.practica.gestionincidencias.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "aranda.api")
public class ArandaProperties {

    private boolean enabled;
    private String url;
    private String token;

    private Integer projectId;
    private Integer serviceId;
    private Integer categoryId;
    private Integer modelId;
    private Integer stateId;
    private Integer authorId;
    private Integer applicantId;

    private Integer itemType = 1;
    private Integer consoleType = 1;

    private int connectTimeoutSeconds = 15;
    private int readTimeoutSeconds = 30;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public Integer getProjectId() {
        return projectId;
    }

    public void setProjectId(Integer projectId) {
        this.projectId = projectId;
    }

    public Integer getServiceId() {
        return serviceId;
    }

    public void setServiceId(Integer serviceId) {
        this.serviceId = serviceId;
    }

    public Integer getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(Integer categoryId) {
        this.categoryId = categoryId;
    }

    public Integer getModelId() {
        return modelId;
    }

    public void setModelId(Integer modelId) {
        this.modelId = modelId;
    }

    public Integer getStateId() {
        return stateId;
    }

    public void setStateId(Integer stateId) {
        this.stateId = stateId;
    }

    public Integer getAuthorId() {
        return authorId;
    }

    public void setAuthorId(Integer authorId) {
        this.authorId = authorId;
    }

    public Integer getApplicantId() {
        return applicantId;
    }

    public void setApplicantId(Integer applicantId) {
        this.applicantId = applicantId;
    }

   public Integer getItemType() {
    return itemType;
    }

    public void setItemType(Integer itemType) {
    this.itemType = itemType;
    }

    public Integer getConsoleType() {
        return consoleType;
    }

    public void setConsoleType(Integer consoleType) {
        this.consoleType = consoleType;
    }

    public int getConnectTimeoutSeconds() {
        return connectTimeoutSeconds;
    }

    public void setConnectTimeoutSeconds(
            int connectTimeoutSeconds) {

        this.connectTimeoutSeconds =
                connectTimeoutSeconds;
    }

    public int getReadTimeoutSeconds() {
        return readTimeoutSeconds;
    }

    public void setReadTimeoutSeconds(
            int readTimeoutSeconds) {

        this.readTimeoutSeconds =
                readTimeoutSeconds;
    }
}