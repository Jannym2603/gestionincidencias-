import { BadRequestException, ForbiddenException, Inject, Injectable, InternalServerErrorException, NotFoundException, Optional, StreamableFile } from '@nestjs/common';
import { CARPETAS_ADJUNTOS_LEGACY } from './almacenamiento.js';
import { constants } from 'node:fs';
import { mkdir, open, realpath, unlink } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { isAbsolute, posix, relative, resolve, sep } from 'node:path';
import { Temporal } from 'temporal-polyfill';
import type { UsuarioAutenticado } from '../security/acceso-proyecto.service.js';
import { AccesoTicketService } from '../tickets/acceso-ticket.service.js';
import { identificador } from '../tickets/tickets.dto.js';
import { AdjuntosRepository } from './adjuntos.repository.js';
import type { Adjunto, AdjuntoNuevo } from './adjuntos.repository.js';

export const CARPETA_ADJUNTOS = Symbol('CARPETA_ADJUNTOS');
export const TAMANIO_MAXIMO = 10 * 1024 * 1024;
const EXTENSIONES = new Set(['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.txt', '.xlsx', '.xls']);
export interface ArchivoRecibido { originalname: string; mimetype: string; size: number; buffer: Buffer }

export function nombreMultipart(nombre: string) {
    // Multer decodes raw multipart filename parameters as latin1. Browsers send UTF-8.
    if ([...nombre].every((c) => c.codePointAt(0)! <= 255)) {
        const bytes = Buffer.from(nombre, 'latin1');
        if (isUtf8(bytes)) return bytes.toString('utf8');
    }
    return nombre;
}

export function nombreSeguro(nombre: string) {
    if (typeof nombre !== 'string' || /[\x00-\x1f\x7f]/.test(nombre)) throw new BadRequestException('Nombre de archivo no válido.');
    const seguro = posix.basename(nombre.replace(/\\/g, '/')) || 'archivo';
    if (seguro.length > 255 || seguro === '.' || seguro === '..') throw new BadRequestException('Nombre de archivo no válido.');
    return seguro;
}

export function dentroDe(base: string, archivo: string) {
    const ruta = relative(base, archivo);
    return ruta !== '' && ruta !== '..' && !ruta.startsWith(`..${sep}`) && !isAbsolute(ruta);
}

export function adjuntoDTO(a: Adjunto) {
    return { id: a.id, ticketId: a.ticketId, nombreArchivo: nombreSeguro(a.nombreArchivo), tipoArchivo: a.tipoArchivo,
        tamanio: a.tamanio === null ? null : Number(a.tamanio), fechaSubida: a.fechaSubida, urlDescarga: `/api/adjuntos/${a.id}/descargar` };
}

@Injectable()
export class AdjuntosService {
    private readonly base: string;
    private readonly bases: string[];
    constructor(private readonly repo: AdjuntosRepository, private readonly acceso: AccesoTicketService,
        @Inject(CARPETA_ADJUNTOS) carpeta: string,
        @Optional() @Inject(CARPETAS_ADJUNTOS_LEGACY) anteriores: string[] = []) {
        this.base = resolve(carpeta); this.bases = [this.base, ...anteriores.map((p) => resolve(p))];
    }

    async findByTicket(id: number, usuario: UsuarioAutenticado) {
        await this.acceso.obtener(id, usuario);
        return (await this.repo.findByTicket(id)).map(adjuntoDTO);
    }

    async upload(id: number, archivo: ArchivoRecibido | undefined, usuario: UsuarioAutenticado) {
        await this.acceso.obtener(id, usuario);
        if (!archivo || !archivo.size || !archivo.buffer?.length) throw new BadRequestException('Debes seleccionar un archivo.');
        if (archivo.size > TAMANIO_MAXIMO || archivo.buffer.length > TAMANIO_MAXIMO) throw new BadRequestException('El archivo supera el tamaño máximo permitido de 10 MB.');
        const nombre = nombreSeguro(nombreMultipart(archivo.originalname));
        const punto = nombre.lastIndexOf('.');
        const extension = punto < 0 ? '' : nombre.slice(punto).toLowerCase();
        if (!EXTENSIONES.has(extension)) throw new BadRequestException('Tipo de archivo no permitido.');
        if (archivo.mimetype.length > 100 || /[\r\n\x00]/.test(archivo.mimetype)) throw new BadRequestException('Tipo de archivo no válido.');
        const ruta = resolve(this.base, `${randomUUID()}${extension}`);
        if (!dentroDe(this.base, ruta) || ruta.length > 500) throw new BadRequestException('Ruta de archivo no válida.');
        let handle: FileHandle | undefined;
        let creado = false;
        try {
            await mkdir(this.base, { recursive: true });
            handle = await open(ruta, 'wx', 0o600);
            creado = true;
            await handle.writeFile(archivo.buffer);
            await handle.close();
            handle = undefined;
            const guardado = await this.repo.create({ ticketId: id, nombreArchivo: nombre, rutaArchivo: ruta,
                tipoArchivo: archivo.mimetype || null, tamanio: BigInt(archivo.buffer.length), fechaSubida: Temporal.Now.plainDateTimeISO() } as AdjuntoNuevo);
            return adjuntoDTO(guardado);
        } catch {
            if (handle) await handle.close().catch(() => undefined);
            if (creado) await unlink(ruta).catch(() => undefined);
            throw new InternalServerErrorException('No se pudo guardar el archivo.');
        }
    }

    async download(id: number, usuario: UsuarioAutenticado) {
        identificador(id, 'id');
        const adjunto = await this.repo.findOne(id);
        if (!adjunto) throw new NotFoundException('Adjunto no encontrado.');
        // Validate the ticket before accessing the filesystem or revealing its existence.
        await this.acceso.obtener(adjunto.ticketId, usuario);
        let ruta: string;
        try { ruta = resolve(adjunto.rutaArchivo); }
        catch { throw new ForbiddenException('La ruta del archivo no es válida.'); }
        const raiz = this.bases.find((base) => dentroDe(base, ruta));
        if (!raiz) throw new ForbiddenException('La ruta del archivo no es válida.');
        let handle: FileHandle | undefined;
        try {
            const baseReal = await realpath(raiz);
            const archivoReal = await realpath(ruta);
            if (!dentroDe(baseReal, archivoReal)) throw new ForbiddenException('La ruta del archivo no es válida.');
            handle = await open(archivoReal, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
            const stat = await handle.stat();
            if (!stat.isFile()) throw new NotFoundException('El archivo no existe o no se puede leer.');
            const nombre = nombreSeguro(adjunto.nombreArchivo);
            const codificado = encodeURIComponent(nombre).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
            const ascii = nombre.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '\\$&');
            const tipo = adjunto.tipoArchivo && /^[\w!#$&^.+-]+\/[\w!#$&^.+-]+(?:;[^\r\n\x00]*)?$/.test(adjunto.tipoArchivo)
                ? adjunto.tipoArchivo : 'application/octet-stream';
            const archivo = new StreamableFile(handle.createReadStream(), { type: tipo, length: stat.size,
                disposition: `attachment; filename="${ascii}"; filename*=UTF-8''${codificado}` });
            handle = undefined; // The stream owns and closes the descriptor.
            return archivo;
        } catch (error) {
            if (handle) await handle.close().catch(() => undefined);
            if (error instanceof ForbiddenException) throw error;
            throw new NotFoundException('El archivo no existe o no se puede leer.');
        }
    }
}
