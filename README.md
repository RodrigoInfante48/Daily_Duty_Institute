# Daily Duty Institute

Página personal tipo **link-in-bio** para Daily Duty Institute — un reemplazo
propio de Linktree: una sola página con perfil y una lista de enlaces
(redes sociales, sitio web, contenido, etc.), totalmente controlada por
nosotros en vez de depender de un servicio de terceros.

## Stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) (v4, vía `@tailwindcss/vite`)
- [Firebase](https://firebase.google.com/) (Firestore + Hosting)
- ESLint + Prettier

## Estructura

```
src/
  components/   # Componentes de UI (ProfileHeader, LinkButton, LinkList, ...)
  data/         # Datos estáticos: perfil (links.ts)
  hooks/        # Hooks reutilizables (useLinks, ...)
  lib/          # Firebase (firebase.ts) y acceso a datos (links.ts), utilidades
  types/        # Tipos compartidos (link.ts)
```

Los links de la página **ya no están hardcodeados**: se leen en tiempo real
desde la colección `links` de Firestore (ver sección siguiente). El único
dato estático que queda es el perfil (`src/data/links.ts`).

## Firebase

### 1. Crear el proyecto

1. Crea un proyecto en la [consola de Firebase](https://console.firebase.google.com/).
2. Habilita **Firestore Database** (modo producción) y **Hosting**.
3. En _Configuración del proyecto > Tus apps_, agrega una app Web y copia el
   objeto de config.

### 2. Variables de entorno

```bash
cp .env.example .env
```

Completa `.env` con los valores del config web del paso anterior
(`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, etc.). `.env` no se
commitea.

Para trackear analítica, habilita **Google Analytics** al crear la app web
(o desde _Configuración del proyecto > Integraciones_) y completa también
`VITE_FIREBASE_MEASUREMENT_ID`. Sin ese valor, la app funciona igual pero
no se envían eventos a Analytics.

### Analytics (GA4 vía Firebase)

Con `VITE_FIREBASE_MEASUREMENT_ID` configurado, la app trackea automáticamente:

- **`page_view`**: al cargar la página, incluyendo los parámetros UTM de la
  URL si están presentes (`utm_source`, `utm_medium`, `utm_content`).
- **`link_click`** (evento custom): cada vez que se hace clic en una card de
  la lista de links, con `link_id`, `link_title` y `destination_url`.
- **`lead_captured`** (evento custom): al enviar el formulario de captura de
  email, con `source_utm`.

Esto permite ver en GA4 qué red social/canal (`utm_source`) trae más
tráfico y qué link tiene mejor CTR (comparando `link_click` contra
`page_view`).

### Captura de email (opcional)

Al final de la lista de links se muestra una card opcional — "Recibe
contenido gratis" — con un input de email y un checkbox de consentimiento
explícito ("Acepto recibir contenido por email"), requerido para poder
enviar el formulario. No bloquea el acceso a los links: se puede cerrar con
el botón ✕ (la elección de cerrarla o de haber enviado el email se guarda en
`localStorage` para no volver a mostrarla).

Al enviar, se crea un documento en la colección `leads` de Firestore:

| Campo        | Tipo               | Descripción                                       |
| ------------ | ------------------ | ------------------------------------------------- |
| `email`      | string             | Email ingresado                                   |
| `source_utm` | string \| null     | Valor de `utm_source` en la URL, si está presente |
| `timestamp`  | timestamp (server) | Fecha de creación del lead                        |

`firestore.rules` permite `create` en `leads` (validando la forma del
documento y el formato del email) pero no permite `read`, `update` ni
`delete` desde el cliente — los leads solo se consultan desde la consola de
Firebase.

### 3. Colección `links`

Cada documento de la colección `links` representa un botón de la lista:

| Campo       | Tipo              | Descripción                          |
| ----------- | ----------------- | ------------------------------------ |
| `title`     | string            | Título del link                      |
| `subtitle`  | string (opcional) | Descripción corta                    |
| `url`       | string            | Destino del link                     |
| `icon`      | string            | Emoji o ícono a mostrar              |
| `order`     | number            | Orden de aparición (ascendente)      |
| `active`    | boolean           | Si es `false`, el link no se muestra |
| `createdAt` | timestamp         | Fecha de creación                    |

Para **agregar, editar o desactivar** un link, edita la colección `links`
directamente desde la consola de Firebase (Firestore Database) — el
cambio se refleja en la página al instante, sin necesidad de re-deployar.

### 4. Reglas de seguridad e índices

Este repo incluye `firestore.rules` (lectura pública solo de links con
`active == true`, sin escritura desde el cliente) y `firestore.indexes.json`
(índice compuesto `active` + `order` que requiere la consulta). Para
desplegarlos:

```bash
npx firebase-tools login
npx firebase-tools use --add   # selecciona tu proyecto (crea .firebaserc, no se commitea)
npx firebase-tools deploy --only firestore
```

### 5. Deploy de Hosting

```bash
npm run build
npx firebase-tools deploy --only hosting
```

### 6. Deploy automático con GitHub Actions

El repo incluye `.github/workflows/firebase-hosting-merge.yml`, que en cada
push a `main` instala dependencias, corre `npm run build` y despliega el
resultado (`dist/`) a Firebase Hosting.

Para que el workflow funcione hay que configurar estos **secrets** en
GitHub (_Settings > Secrets and variables > Actions > New repository
secret_):

| Secret                              | Valor                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `FIREBASE_PROJECT_ID`               | El Project ID de Firebase (ej. `daily-duty-institute`)                |
| `FIREBASE_SERVICE_ACCOUNT`          | JSON completo de una service account con permiso de deploy (ver abajo) |
| `VITE_FIREBASE_API_KEY`             | Igual que en tu `.env`                                                 |
| `VITE_FIREBASE_AUTH_DOMAIN`         | Igual que en tu `.env`                                                 |
| `VITE_FIREBASE_PROJECT_ID`          | Igual que en tu `.env`                                                 |
| `VITE_FIREBASE_STORAGE_BUCKET`      | Igual que en tu `.env`                                                 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Igual que en tu `.env`                                                 |
| `VITE_FIREBASE_APP_ID`              | Igual que en tu `.env`                                                 |
| `VITE_FIREBASE_MEASUREMENT_ID`      | Igual que en tu `.env` (opcional)                                      |

**Cómo generar `FIREBASE_SERVICE_ACCOUNT`:**

1. En la [consola de Google Cloud](https://console.cloud.google.com/iam-admin/serviceaccounts)
   (mismo proyecto que tu Firebase), crea una service account, ej.
   `github-actions-deploy`.
2. Asígnale el rol **Firebase Hosting Admin** (y **Firebase Admin** si
   también quieres que despliegue Firestore rules/índices desde CI).
3. Genera una clave JSON para esa service account (_Keys > Add key > Create
   new key > JSON_) y descarga el archivo.
4. Copia **todo el contenido del JSON** y pégalo como valor del secret
   `FIREBASE_SERVICE_ACCOUNT` en GitHub.

Alternativa más simple: correr `npx firebase-tools init hosting:github`
localmente (autenticado con una cuenta que tenga acceso al proyecto); el
propio CLI crea la service account, la guarda como secret y genera un
workflow equivalente.

Una vez configurados los secrets, cualquier merge/push a `main` dispara el
deploy automáticamente — no hace falta correr `firebase deploy` a mano.

### 7. Dominio personalizado (ej. `link.dailyduty.co`)

1. Entra a **Firebase Console > Hosting** del proyecto y haz clic en **Agregar
   dominio personalizado**.
2. Escribe el dominio o subdominio, por ejemplo `link.dailyduty.co`.
3. Firebase te pedirá **verificar la propiedad del dominio**: te da un
   registro TXT para agregar en el DNS de `dailyduty.co`. Agrégalo en tu
   proveedor de DNS y espera a que Firebase confirme la verificación (puede
   tardar unos minutos).
4. Después de verificar, Firebase muestra los **registros DNS a configurar**
   para el subdominio. Para un subdominio (`link.dailyduty.co`) normalmente
   es un registro **A** (o **CNAME**, según el caso) apuntando a las IPs o
   al host que indique la consola — usa exactamente los valores que Firebase
   te muestre en ese momento, ya que pueden variar.
5. Agrega ese registro en el DNS de `dailyduty.co` (en Cloudflare, GoDaddy,
   Namecheap, etc., donde esté administrado el dominio).
6. Espera la propagación del DNS (minutos a horas) y a que Firebase emita el
   certificado SSL automáticamente. El estado en la consola pasa de
   "Necesita configuración" a "Conectado".
7. Repite el proceso (paso 1 en adelante) si además quieres usar el dominio
   raíz `dailyduty.co` o el subdominio `www`.

No hace falta ningún cambio en `firebase.json` ni en el workflow de GitHub
Actions para usar un dominio personalizado: una vez conectado en la consola,
Firebase sirve el mismo contenido de Hosting (el de cada deploy a `main`) en
ese dominio automáticamente.

## Desarrollo

```bash
npm install
cp .env.example .env   # y completa tus credenciales de Firebase
npm run dev
```

## Scripts

| Comando                | Descripción                             |
| ---------------------- | --------------------------------------- |
| `npm run dev`          | Servidor de desarrollo con HMR          |
| `npm run build`        | Type-check + build de producción        |
| `npm run preview`      | Sirve el build de producción localmente |
| `npm run lint`         | Corre ESLint                            |
| `npm run format`       | Formatea el proyecto con Prettier       |
| `npm run format:check` | Verifica formato sin escribir cambios   |
