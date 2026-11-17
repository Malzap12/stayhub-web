# StayHub Web — Inversiones LR

Frontend del marketplace de alojamientos **StayHub (Inversiones LR)**, construido con Angular 19 (componentes standalone y rutas con carga diferida). En producción se sirve con nginx.

La API vive en el repositorio [stayhub-api](https://github.com/Malzap12/stayhub-api).

## Contenido

- [Estructura](#estructura)
- [Requisitos](#requisitos)
- [Ejecución local](#ejecución-local)
- [Comunicación con la API](#comunicación-con-la-api)
- [Build de producción y Docker](#build-de-producción-y-docker)
- [Pruebas](#pruebas)
- [Despliegue](#despliegue)
- [Flujo de trabajo](#flujo-de-trabajo)

## Estructura

```
src/
├── index.html, main.ts, styles.css
└── app/
    ├── app.component.ts        Layout (navbar, pie de página)
    ├── app.routes.ts           Rutas con carga diferida y guards por rol
    ├── core/guards/            Sesión por pestaña (sessionStorage) y control de acceso por rol
    ├── shared/
    │   ├── components/         Navbar, mapa (OpenStreetMap), campana de notificaciones
    │   └── models/             Modelos y etiquetas compartidas
    └── features/
        ├── auth/               Login, registro, recuperación de contraseña, acceso denegado
        ├── listings/           Catálogo, detalle, cotización, publicaciones del anfitrión, moderación
        ├── bookings/           Mis reservas, reservas del anfitrión, pago de prueba, reembolsos
        ├── favorites/          Mis favoritos
        ├── messages/           Conversaciones
        ├── profile/            Mi perfil y desactivación de cuenta
        └── admin/              Panel de negocio, auditoría y configuración de la plataforma
public/                         Archivos estáticos (favicon)
nginx.conf                      Servidor de producción: SPA, caché, cabeceras de seguridad y proxy /api
proxy.conf.json                 Proxy de desarrollo: /api → http://localhost:3000
```

## Requisitos

- Node.js 22 LTS (Angular 19 acepta `^20.11.1 || >=22`) y npm 10 o superior
- La API de StayHub corriendo en `http://localhost:3000`
- Chrome o Edge para las pruebas unitarias (Karma)

## Ejecución local

### Opción A — Stack completo con Docker (recomendado)

Clona los repositorios uno al lado del otro y usa el compose de desarrollo que vive en el repositorio de la API:

```bash
git clone https://github.com/Malzap12/stayhub-api.git inversiones-lr-api
git clone https://github.com/Malzap12/stayhub-web.git inversiones-lr-web
cd inversiones-lr-api/deploy
docker compose up -d --build
```

La web queda en http://localhost:4200 y los correos de prueba en http://localhost:8025.

### Opción B — Servidor de desarrollo de Angular

Con la API corriendo en `http://localhost:3000` (ver el README de la API):

```bash
npm ci
npm start                # ng serve → http://localhost:4200, con recarga automática
```

`ng serve` reenvía `/api/*` a `http://localhost:3000` mediante `proxy.conf.json`.

### Scripts

| Script | Descripción |
|---|---|
| `npm start` | Servidor de desarrollo con proxy hacia la API |
| `npm run build` | Build de **producción** en `dist/stayhub-web/browser` |
| `npm run watch` | Build de desarrollo en modo observación |
| `npm test` | Pruebas unitarias con Karma (modo observación) |
| `npm run test:ci` | Pruebas en una sola pasada con Chrome headless |

## Comunicación con la API

- Todas las llamadas usan rutas relativas `/api/...`, del mismo origen que la página.
  - En desarrollo las reenvía `proxy.conf.json`.
  - En Docker las reenvía `nginx.conf` al servicio `api:3000`.
  - Por eso no hace falta configurar la URL de la API ni CORS.
- La sesión (token Bearer, usuario y vencimiento) se guarda en `sessionStorage`, una por pestaña.
- El mapa usa los tiles públicos de OpenStreetMap. No requiere claves de API.

## Build de producción y Docker

```bash
npm run build                          # dist/stayhub-web/browser
docker build -t stayhub-web .          # node:22 (build) + nginx:1.28 (servir)
```

La imagen usa `nginx.conf`, que hace lo siguiente:

- sirve la SPA con respaldo a `index.html` y deja `index.html` sin caché;
- cachea por un año los archivos con hash;
- aplica gzip y cabeceras de seguridad (CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy);
- reenvía `/api/` al contenedor `api:3000`, con un límite de subida de 55 MB y un timeout de 120 s para los reportes.

El contenedor necesita estar en la misma red que un servicio llamado `api`. El compose de `stayhub-api/deploy/` lo resuelve.

## Pruebas

```bash
npm test                 # Karma en modo observación
npm run test:ci          # una pasada, Chrome headless
```

Si no tienes Chrome, apunta Karma a Edge con `CHROME_BIN`, por ejemplo `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`.

La CI de GitHub Actions (`.github/workflows/ci.yml`) ejecuta estos pasos en cada push y PR a `main`:

1. `npm ci`
2. build de producción
3. build de la imagen Docker
4. análisis de SonarCloud

## Despliegue

El despliegue en producción (VPS con Docker Compose y HTTPS mediante Caddy) se documenta en el repositorio de la API, en [`deploy/README.md`](https://github.com/Malzap12/stayhub-api/blob/main/deploy/README.md).

## Flujo de trabajo

- No se hace push directo a `main`. Cada cambio va en una rama `feature/HU-XXX-...`, `feature/TA-XX-...` o `fix/...` con un Pull Request.
- Los commits siguen Conventional Commits con el ID de Jira, por ejemplo `feat(HU-012): ... (CA1)`.
- La interfaz no debe mostrar referencias internas como `HU-XXX` o `RF-XXX`.
- El merge requiere la CI en verde, el Quality Gate de SonarCloud aprobado y la revisión de un compañero.
