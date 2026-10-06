import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ApiExceptionFilter } from './security/api-exception.filter.js';
import { AdministracionModule } from './administracion/administracion.module.js';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { RolesModule } from './roles/roles.module.js';
import { TiposIncidenciaModule } from './tipos-incidencia/tipos-incidencia.module.js';
import { CompaniasModule } from './companias/companias.module.js';
import { ProyectosModule } from './proyectos/proyectos.module.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';
import { AuthModule } from './auth/auth.module.js';
import { TicketsModule } from './tickets/tickets.module.js';
import { ComentariosModule } from './comentarios/comentarios.module.js';
import { HistorialTicketsModule } from './historial-tickets/historial-tickets.module.js';
import { AdjuntosModule } from './adjuntos/adjuntos.module.js';
import { SolicitudesRecursosModule } from './solicitudes-recursos/solicitudes-recursos.module.js';
import { ReportesModule } from './reportes/reportes.module.js';
import { ConfiguracionSistemaModule } from './configuracion/configuracion-sistema.module.js';
import { EnlacesCompartidosModule } from './enlaces-compartidos/enlaces-compartidos.module.js';

@Module({
  imports: [
    AdministracionModule,
    RolesModule,
    TiposIncidenciaModule,
    CompaniasModule,
    ProyectosModule,
    UsuariosModule,
    AuthModule,
    TicketsModule,
    ComentariosModule,
    HistorialTicketsModule,
    AdjuntosModule,
    SolicitudesRecursosModule,
    ReportesModule,
    ConfiguracionSistemaModule,
    EnlacesCompartidosModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
