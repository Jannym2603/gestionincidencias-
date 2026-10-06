import { Body, Controller, HttpCode, Post, Req, UseFilters, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { loginDTO } from './auth.rules.js';
import { JwtAuthGuard } from '../security/jwt-auth.guard.js';
import { AuthExceptionFilter } from './auth-exception.filter.js';

@Controller('api/auth')
@UseFilters(new AuthExceptionFilter())
export class AuthController {
    constructor(private readonly authService: AuthService) {}
    @Post('login')
    @HttpCode(200)
    login(@Body() body: unknown) { const datos = loginDTO(body); return this.authService.login(datos.correo, datos.password); }
    @Post('cambiar-password')
    @HttpCode(200)
    @UseGuards(JwtAuthGuard)
    cambiarPassword(@Body() body: unknown, @Req() req: Request & { user: { sub?: unknown } }) {
        return this.authService.cambiarPassword(body, req.user.sub);
    }
    @Post('solicitar-recuperacion')
    @HttpCode(200)
    solicitarRecuperacion(@Body() body: unknown) { return this.authService.solicitarRecuperacion(body); }
    @Post('confirmar-recuperacion')
    @HttpCode(200)
    confirmarRecuperacion(@Body() body: unknown) { return this.authService.confirmarRecuperacion(body); }
}
