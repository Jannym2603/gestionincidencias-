import * as bcrypt from 'bcrypt';
import { codificar, coincide, correoDTO, generarCodigo, nuevaPasswordDTO, passwordEntrada } from './auth.rules.js';

describe('Auth reglas de seguridad', () => {
    it('generacion criptografica siempre seis digitos, incluido rango de ceros iniciales', () => {
        const codigos = Array.from({ length: 100 }, generarCodigo);
        expect(codigos.every((c) => /^\d{6}$/.test(c))).toBe(true);
        expect(new Set(codigos).size).toBeGreaterThan(1);
    });
    it('BCrypt coste 10 y compatibilidad $2a/$2b/$2y', async () => {
        const hash = await codificar('password-prueba');
        expect(bcrypt.getRounds(hash)).toBe(10);
        for (const prefijo of ['$2a$', '$2b$', '$2y$']) expect(await coincide('password-prueba', hash.replace('$2b$', prefijo))).toBe(true);
        expect(await coincide('incorrecta', hash)).toBe(false);
    });
    it('legacy permitido solo donde Spring lo permite y valores vacios rechazados', async () => {
        expect(await coincide('123456', '123456')).toBe(true);
        expect(await coincide('123456', '123456', false)).toBe(false);
        expect(await coincide('123456', null)).toBe(false);
        expect(await coincide('123456', '')).toBe(false);
        expect(await coincide('123456', '654321')).toBe(false);
    });
    it('limita nuevas contraseñas a 72 bytes y conserva comparacion antigua de Spring', async () => {
        const password = 'x'.repeat(72);
        const hash = await codificar(password);
        expect(await coincide(password, hash)).toBe(true);
        expect(await coincide(`${password}otro`, hash)).toBe(true);
        expect(() => nuevaPasswordDTO(`${password}otro`)).toThrow('72 bytes');
        expect(() => nuevaPasswordDTO('é'.repeat(37))).toThrow('72 bytes');
        expect(nuevaPasswordDTO('é'.repeat(36))).toHaveLength(36);
    });
    it('separa validacion DTO previa de trim y regla posterior al codigo', () => {
        expect(passwordEntrada(' 1234 ')).toBe('1234');
        expect(() => nuevaPasswordDTO('1234')).toThrow('6 caracteres');
        expect(nuevaPasswordDTO(' 123456 ')).toBe('123456');
        expect(() => passwordEntrada('12345')).toThrow();
    });
    it.each([null, 42, {}, 'sin-arroba', 'a b@example.test', 'a@@example.test', 'a..b@example.test', '.a@example.test',
        'a@example.test.', 'a@-example.test', 'a'.repeat(65) + '@example.test', ' a@example.test '])('correo invalido %j', (correo) => {
        expect(() => correoDTO(correo)).toThrow();
    });
    it('normaliza correo sin patrones SQL', () => {
        expect(correoDTO('USUARIO@EXAMPLE.TEST')).toBe('usuario@example.test');
        expect(correoDTO('user_1@example.test')).toBe('user_1@example.test');
    });
    it.each(['"a b"@example.test', 'a@localhost', 'a@[127.0.0.1]', 'a@[IPv6:::1]', 'usuario@ejémplo.test'])('@Email acepta %s', (correo) => {
        expect(correoDTO(correo)).toBe(correo.toLowerCase());
    });
});
