import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Temporal } from 'temporal-polyfill';
import request from 'supertest';
import { AuthModule } from '../src/auth/auth.module.js';
import { AuthRepository } from '../src/auth/auth.repository.js';
import { NotificacionService } from '../src/notificaciones/notificacion.service.js';
import { MENSAJE_PASSWORD, MENSAJE_RECUPERACION } from '../src/auth/auth.rules.js';
import { authFixture } from './auth-fixture.js';

describe('Auth HTTP: paridad Spring Boot', () => {
    let app: INestApplication;
    let jwt: JwtService;
    let f: ReturnType<typeof authFixture>;
    let hash: string;
    const anterior = 'password-inicial';
    const nueva = 'password-nueva';
    const correo = 'usuario@example.test';
    const raiz = '/api/auth';
    beforeAll(async () => { hash = await bcrypt.hash(anterior, 4); });
    beforeEach(async () => {
        f = authFixture(hash);
        const mod = await Test.createTestingModule({ imports: [AuthModule] })
            .overrideProvider(AuthRepository).useValue(f.repo)
            .overrideProvider(NotificacionService).useValue(f.notificaciones).compile();
        app = mod.createNestApplication({ logger: false });
        await app.init();
        jwt = app.get(JwtService);
    });
    afterEach(async () => { await app?.close(); });
    function post(endpoint: string, body: unknown) { return request(app.getHttpServer()).post(`${raiz}/${endpoint}`).send(body as object); }
    function cambio(body = { passwordActual: anterior, nuevaPassword: nueva }, sub: unknown = correo) {
        return post('cambiar-password', body).set('Authorization', `Bearer ${jwt.sign({ sub, usuarioId: 1, rol: 'CLIENTE' })}`);
    }
    async function solicitar() {
        const response = await post('solicitar-recuperacion', { correo }).expect(200);
        expect(response.text).toBe(MENSAJE_RECUPERACION);
        return f.notificaciones.notificarCodigoRecuperacionPassword.mock.calls.at(-1)![1] as string;
    }
    it('login BCrypt correcto, contrato JWT y respuesta sin hash', async () => {
        const res = await post('login', { correo: 'USUARIO@EXAMPLE.TEST', password: ` ${anterior} ` }).expect(200);
        expect(Object.keys(res.body).sort()).toEqual(['correo', 'id', 'nombre', 'rol', 'token']);
        const token = await jwt.verifyAsync(res.body.token);
        expect(token).toMatchObject({ sub: correo, usuarioId: 1, rol: 'CLIENTE' });
        expect(token.exp - token.iat).toBe(28800);
        expect(res.text).not.toContain(hash);
    });
    it.each([{ correo: 'otro@example.test', password: anterior }, { correo, password: 'incorrecta' }])('login invalido -> 400 %j', async (body) => {
        await post('login', body).expect(400);
    });
    it.each([false, null])('usuario estado %s no inicia sesion', async (estado) => {
        f.usuario.estado = estado;
        await post('login', { correo, password: anterior }).expect(400);
    });
    it('sin rol no inicia sesion', async () => {
        f.repo.findRol.mockResolvedValueOnce(null);
        await post('login', { correo, password: anterior }).expect(400);
    });
    it('login legado migra a BCrypt coste 10', async () => {
        Object.assign(f.usuario, { password: anterior });
        await post('login', { correo, password: anterior }).expect(200);
        expect(f.usuario.password).toMatch(/^\$2b\$10\$/);
        expect(await bcrypt.compare(anterior, f.usuario.password)).toBe(true);
    });
    it.each(['$2a$', '$2y$'])('login acepta hash Spring %s', async (prefijo) => {
        Object.assign(f.usuario, { password: hash.replace('$2b$', prefijo) });
        await post('login', { correo, password: anterior }).expect(200);
    });
    it('solicitud: codigo seguro de seis digitos, solo hash, expiracion 10 minutos, sin secretos', async () => {
        const codigo = await solicitar();
        expect(codigo).toMatch(/^\d{6}$/);
        const c = f.codigos[0]!;
        expect(c.codigo).toMatch(/^\$2b\$10\$/);
        expect(c.codigo).not.toBe(codigo);
        expect(await bcrypt.compare(codigo, c.codigo)).toBe(true);
        expect(c.fechaCreacion.until(c.fechaExpiracion, { largestUnit: 'minutes' }).minutes).toBe(10);
        expect(c).toMatchObject({ usado: false, intentosFallidos: 0, correo });
    });
    it('correo inexistente/inactivo responde igual y no genera ni envia codigo', async () => {
        const existente = await solicitar();
        expect(existente).toMatch(/^\d{6}$/);
        f.notificaciones.notificarCodigoRecuperacionPassword.mockClear();
        const desconocido = await post('solicitar-recuperacion', { correo: 'otro@example.test' }).expect(200);
        f.usuario.estado = false;
        const inactivo = await post('solicitar-recuperacion', { correo }).expect(200);
        expect(desconocido.text).toBe(MENSAJE_RECUPERACION);
        expect(inactivo.text).toBe(MENSAJE_RECUPERACION);
        expect(f.codigos).toHaveLength(1);
        expect(f.notificaciones.notificarCodigoRecuperacionPassword).not.toHaveBeenCalled();
    });
    it('nueva solicitud reemplaza codigo anterior solamente de esa cuenta', async () => {
        await solicitar();
        const id = f.codigos[0]!.id;
        f.codigos.push({ ...f.codigos[0]!, id: 99, correo: 'otra@example.test' as typeof f.codigos[0]['correo'] });
        await solicitar();
        expect(f.codigos).toHaveLength(2);
        expect(f.codigos.some((c) => c.id === id)).toBe(false);
        expect(f.codigos.some((c) => c.id === 99)).toBe(true);
    });
    it('codigo valido cambia BCrypt e invalida; no reutilizable y nueva password inicia sesion', async () => {
        const codigo = await solicitar();
        const response = await post('confirmar-recuperacion', { correo, codigo, nuevaPassword: nueva }).expect(200);
        expect(response.text).toBe(MENSAJE_PASSWORD);
        expect(response.text).not.toContain(codigo);
        expect(f.codigos[0]!.usado).toBe(true);
        expect(await bcrypt.compare(nueva, f.usuario.password)).toBe(true);
        await post('confirmar-recuperacion', { correo, codigo, nuevaPassword: 'otra-nueva' }).expect(400);
        await post('login', { correo, password: nueva }).expect(200);
        await post('login', { correo, password: anterior }).expect(400);
    });
    it('codigo invalido persiste intentos; quinto bloquea y codigo correcto ya no funciona', async () => {
        const codigo = await solicitar();
        const incorrecto = codigo === '000000' ? '111111' : '000000';
        for (let intento = 1; intento <= 5; intento++) {
            const res = await post('confirmar-recuperacion', { correo, codigo: incorrecto, nuevaPassword: nueva }).expect(400);
            expect(f.codigos[0]!.intentosFallidos).toBe(intento);
            expect(res.body.message).toContain(intento < 5 ? `Intentos restantes: ${5 - intento}` : 'bloqueado');
            expect(res.text).not.toContain(f.codigos[0]!.codigo);
            expect(res.text).not.toContain(incorrecto);
        }
        expect(f.codigos[0]!.usado).toBe(true);
        await post('confirmar-recuperacion', { correo, codigo, nuevaPassword: nueva }).expect(400);
        expect(f.usuario.password).toBe(hash);
    });
    it('orden Spring: nueva password con trim corto se valida solo despues de codigo correcto', async () => {
        const codigo = await solicitar();
        const incorrecto = codigo === '000000' ? '111111' : '000000';
        await post('confirmar-recuperacion', { correo, codigo: incorrecto, nuevaPassword: ' 1234 ' }).expect(400);
        expect(f.codigos[0]!.intentosFallidos).toBe(1);
        await post('confirmar-recuperacion', { correo, codigo, nuevaPassword: ' 1234 ' }).expect(400);
        expect(f.codigos[0]!.intentosFallidos).toBe(1);
        expect(f.codigos[0]!.usado).toBe(false);
    });
    it('intentos incorrectos concurrentes se acumulan hasta bloquear', async () => {
        const codigo = await solicitar();
        const incorrecto = codigo === '000000' ? '111111' : '000000';
        const resultados = await Promise.all(Array.from({ length: 5 }, () => post('confirmar-recuperacion', { correo, codigo: incorrecto, nuevaPassword: nueva })));
        expect(resultados.every((r) => r.status === 400)).toBe(true);
        expect(f.codigos[0]!).toMatchObject({ usado: true, intentosFallidos: 5 });
    });
    it('errores usan contrato Spring sin hash ni codigo', async () => {
        const res = await post('login', { correo, password: 'incorrecta' }).expect(400);
        expect(Object.keys(res.body).sort()).toEqual(['error', 'message', 'status', 'timestamp']);
        expect(res.body).toMatchObject({ status: 400, error: 'Bad Request', message: 'Contrasena incorrecta.' });
        expect(res.text).not.toContain(hash);
    });
    it('codigo expirado invalida y no modifica contraseña', async () => {
        const codigo = await solicitar();
        f.codigos[0]!.fechaExpiracion = Temporal.Now.plainDateTimeISO().subtract({ seconds: 1 });
        const res = await post('confirmar-recuperacion', { correo, codigo, nuevaPassword: nueva }).expect(400);
        expect(res.body.message).toContain('expiro');
        expect(f.codigos[0]!.usado).toBe(true);
        expect(f.usuario.password).toBe(hash);
    });
    it('codigo ya con cinco intentos se invalida antes de comparar', async () => {
        const codigo = await solicitar();
        f.codigos[0]!.intentosFallidos = 5;
        await post('confirmar-recuperacion', { correo, codigo, nuevaPassword: nueva }).expect(400);
        expect(f.codigos[0]!.usado).toBe(true);
    });
    it('recuperacion sin codigo, usuario inexistente o inactivo devuelve 400', async () => {
        await post('confirmar-recuperacion', { correo, codigo: '123456', nuevaPassword: nueva }).expect(400);
        await post('confirmar-recuperacion', { correo: 'otro@example.test', codigo: '123456', nuevaPassword: nueva }).expect(400);
        await solicitar();
        f.usuario.estado = false;
        await post('confirmar-recuperacion', { correo, codigo: '123456', nuevaPassword: nueva }).expect(400);
        expect(f.codigos[0]!.intentosFallidos).toBe(0);
    });
    it('codigo legado temporal sigue siendo valido', async () => {
        await solicitar();
        Object.assign(f.codigos[0]!, { codigo: '123456' });
        await post('confirmar-recuperacion', { correo, codigo: '123456', nuevaPassword: nueva }).expect(200);
    });
    it('nueva contraseña igual a la actual se rechaza sin consumir codigo', async () => {
        const codigo = await solicitar();
        await post('confirmar-recuperacion', { correo, codigo, nuevaPassword: anterior }).expect(400);
        expect(f.codigos[0]!.usado).toBe(false);
        expect(f.codigos[0]!.intentosFallidos).toBe(0);
    });
    it('cambiar exige JWT', async () => {
        await post('cambiar-password', { passwordActual: anterior, nuevaPassword: nueva }).expect(401);
        await post('cambiar-password', {}).set('Authorization', 'Bearer invalido').expect(401);
    });
    it('cambio correcto, sujeto JWT determina cuenta y respuesta sin secretos', async () => {
        const res = await cambio().expect(200);
        expect(res.text).toBe(MENSAJE_PASSWORD);
        expect(await bcrypt.compare(nueva, f.usuario.password)).toBe(true);
        expect(f.usuario.password).toMatch(/^\$2b\$10\$/);
        expect(f.notificaciones.notificarCodigoRecuperacionPassword).not.toHaveBeenCalled();
    });
    it.each([{ passwordActual: 'incorrecta', nuevaPassword: nueva }, { passwordActual: anterior, nuevaPassword: anterior },
        { passwordActual: anterior, nuevaPassword: '12345' }, { passwordActual: '', nuevaPassword: nueva }])('cambio invalido %j -> 400', async (body) => {
        await cambio(body).expect(400);
        expect(f.usuario.password).toBe(hash);
    });
    it('cambio inactivo 403, sujeto ausente/inexistente 401', async () => {
        f.usuario.estado = false;
        await cambio().expect(403);
        await cambio(undefined, 'otro@example.test').expect(401);
        await cambio(undefined, null).expect(401);
    });
    it('cambio migra contraseña antigua incluso si nueva es igual y se rechaza', async () => {
        Object.assign(f.usuario, { password: anterior });
        await cambio({ passwordActual: anterior, nuevaPassword: anterior }).expect(400);
        expect(f.usuario.password).toMatch(/^\$2b\$10\$/);
    });
    it('fallo SMTP no tumba API y codigo permanece recuperable', async () => {
        f.notificaciones.notificarCodigoRecuperacionPassword.mockRejectedValueOnce(new Error('SMTP simulado'));
        await post('solicitar-recuperacion', { correo }).expect(200);
        expect(f.codigos).toHaveLength(1);
        await post('login', { correo, password: anterior }).expect(200);
    });
    it('fallo al persistir codigo revierte reemplazo y no envia correo', async () => {
        await solicitar();
        const anteriorCodigo = { ...f.codigos[0]! };
        f.notificaciones.notificarCodigoRecuperacionPassword.mockClear();
        f.repo.createCodigo.mockRejectedValueOnce(new Error('persistencia simulada'));
        await post('solicitar-recuperacion', { correo }).expect(500);
        expect(f.codigos).toEqual([anteriorCodigo]);
        expect(f.notificaciones.notificarCodigoRecuperacionPassword).not.toHaveBeenCalled();
    });
    it('fallo invalidacion revierte password; confirmacion concurrente solo una tiene exito', async () => {
        const codigo = await solicitar();
        f.repo.updateCodigo.mockRejectedValueOnce(new Error('persistencia simulada'));
        await post('confirmar-recuperacion', { correo, codigo, nuevaPassword: nueva }).expect(500);
        expect(f.usuario.password).toBe(hash);
        expect(f.codigos[0]!.usado).toBe(false);
        const resultados = await Promise.all([post('confirmar-recuperacion', { correo, codigo, nuevaPassword: nueva }),
            post('confirmar-recuperacion', { correo, codigo, nuevaPassword: 'otra-nueva' })]);
        expect(resultados.map((r) => r.status).sort()).toEqual([200, 400]);
    });
    it.each(['login', 'solicitar-recuperacion', 'confirmar-recuperacion'])('%s valida correo y tipo de cuerpo', async (endpoint) => {
        for (const body of [{ correo: 'invalido', password: anterior, codigo: '123456', nuevaPassword: nueva },
            { correo: 7, password: anterior }, {}, []]) await post(endpoint, body).expect(400);
    });
    it.each(['12345', '      ', 'x'.repeat(73), 'é'.repeat(37)])('password nueva invalida (%s)', async (nuevaPassword) => {
        const codigo = await solicitar();
        await post('confirmar-recuperacion', { correo, codigo, nuevaPassword }).expect(400);
        await cambio({ passwordActual: anterior, nuevaPassword }).expect(400);
        expect(f.usuario.password).toBe(hash);
        expect(f.codigos[0]!.usado).toBe(false);
    });
});
