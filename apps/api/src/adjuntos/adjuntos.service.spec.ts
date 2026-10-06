import { resolve } from 'node:path';
import { nombreSeguro, nombreMultipart, dentroDe, TAMANIO_MAXIMO } from './adjuntos.service.js';

describe('Adjuntos: nombres y limites del almacenamiento', () => {
    it.each(['../archivo.pdf', '..\\archivo.pdf', 'C:\\Usuarios\\archivo.pdf', '/tmp/archivo.pdf'])
        ('elimina rutas del nombre %s', (nombre) => { expect(nombreSeguro(nombre)).toBe('archivo.pdf'); });
    it.each(['a\r\nContent-Type: text/html.txt', 'archivo\u0000.txt', '..', '.', 'a'.repeat(256)])
        ('rechaza nombres con controles, segmentos invalidos o longitud excesiva', (nombre) => { expect(() => nombreSeguro(nombre)).toThrow(); });
    it('contencion requiere descendiente real, no prefijo compartido', () => {
        const base = resolve('uploads', 'adjuntos');
        expect(dentroDe(base, resolve(base, 'archivo.pdf'))).toBe(true);
        expect(dentroDe(base, base)).toBe(false);
        expect(dentroDe(base, resolve(base, '..', 'privado.pdf'))).toBe(false);
        expect(dentroDe(base, resolve(`${base}-externo`, 'archivo.pdf'))).toBe(false);
    });
    it('conserva limite de 10 MiB de Spring Boot', () => { expect(TAMANIO_MAXIMO).toBe(10485760); });
    it('recupera UTF-8 multipart y conserva nombres latin1 o Unicode ya decodificados', () => {
        expect(nombreMultipart(Buffer.from('Información ñ.txt', 'utf8').toString('latin1'))).toBe('Información ñ.txt');
        expect(nombreMultipart('Información ñ.txt')).toBe('Información ñ.txt');
        expect(nombreMultipart('日本語.txt')).toBe('日本語.txt');
    });
});
