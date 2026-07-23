from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import threading


class ArandaMockHandler(BaseHTTPRequestHandler):

    contador = 84523
    bloqueo = threading.Lock()

    def do_POST(self):
        if self.path != "/ASMSAPI/api/v9/item":
            self.enviar_respuesta(
                404,
                {
                    "message": "Ruta no encontrada"
                }
            )
            return

        content_length = int(
            self.headers.get(
                "Content-Length",
                0
            )
        )

        if content_length > 0:
            cuerpo = self.rfile.read(
                content_length
            )

            try:
                datos_recibidos = json.loads(
                    cuerpo.decode("utf-8")
                )

                print(
                    "Solicitud recibida desde "
                    "Gestión de Incidencias:"
                )

                print(
                    json.dumps(
                        datos_recibidos,
                        indent=2,
                        ensure_ascii=False
                    )
                )

            except Exception:
                print(
                    "Se recibió una solicitud "
                    "sin JSON válido."
                )

        with ArandaMockHandler.bloqueo:
            ArandaMockHandler.contador += 1

            nuevo_id = (
                ArandaMockHandler.contador
            )

        response = {
            "id": nuevo_id,
            "idByProject": (
                f"INC-{nuevo_id:06d}"
            )
        }

        self.enviar_respuesta(
            201,
            response
        )

    def enviar_respuesta(
            self,
            codigo,
            contenido):

        body = json.dumps(
            contenido,
            ensure_ascii=False
        ).encode("utf-8")

        self.send_response(codigo)

        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8"
        )

        self.send_header(
            "Content-Length",
            str(len(body))
        )

        self.end_headers()

        self.wfile.write(body)

    def log_message(
            self,
            format,
            *args):

        print(
            f"{self.address_string()} - "
            f"{self.command} "
            f"{self.path} - "
            f"{format % args}"
        )


if __name__ == "__main__":

    server = HTTPServer(
        (
            "localhost",
            9090
        ),
        ArandaMockHandler
    )

    print(
        "Aranda Mock iniciado"
    )

    print(
        "URL: http://localhost:9090"
    )

    print(
        "Ruta: POST /ASMSAPI/api/v9/item"
    )

    print(
        "Cada solicitud generará "
        "un ID diferente."
    )

    print(
        "Presiona Ctrl + C para detenerlo"
    )

    try:
        server.serve_forever()

    except KeyboardInterrupt:
        print(
            "\nDeteniendo Aranda Mock..."
        )

        server.server_close()