# Front End Store

Tienda virtual de camisetas con temática de tecnologías frontend. Incluye catálogo dinámico, detalle de producto, carrito, autenticación de administrador, panel CRUD y registro de ventas con fidelidad de clientes.

## Tecnologías

- HTML5
- CSS3 (Grid, Flexbox y diseño responsive)
- JavaScript Vanilla
- PHP 8.3 + PDO
- MySQL 8 / MariaDB 10.5+

## Estructura

```
.
├── index.html              Catálogo dinámico
├── nosotros.html           Información de la tienda
├── producto.html           Detalle de producto
├── carrito.html            Carrito y datos del comprador
├── login.html              Acceso administrador
├── admin.html              Gestión de productos
├── admin-imagenes.html     Imágenes decorativas del catálogo
├── admin-ventas.html       Registro de ventas y clientes
├── css/
│   ├── normalize.css
│   ├── theme.css           Paleta y tokens de color
│   ├── styles.css
│   └── components.css
├── js/
│   ├── api.js              Cliente de la API PHP
│   ├── theme.js            Aplica y sincroniza la paleta del sitio
│   ├── auth.js             Sesión de administrador
│   ├── store.js            Carrito en localStorage
│   ├── ui.js               Toasts y contador del carrito
│   ├── cart.js             Carrito y checkout
│   ├── catalogo.js         Render del catálogo
│   ├── producto.js         Detalle de producto
│   ├── admin-productos.js  CRUD y paginación de productos
│   ├── admin-imagenes.js   Configuración de imágenes
│   └── admin-ventas.js     Ventas, clientes y paginación
├── api/
│   ├── config.php          Configuración de la API
│   ├── db.php              Conexión PDO
│   ├── helpers.php         Utilidades, auth, CSRF y validación
│   ├── bootstrap.php       Arranque común
│   ├── login.php / logout.php / me.php
│   ├── products.php / product.php
│   ├── orders.php          Alta de pedidos
│   └── admin/              Pedidos, estados, resumen de clientes y subida de imágenes
├── sql/
│   ├── schema.sql          Tablas y relaciones
│   ├── seed_admin.php      Administrador inicial
│   └── seed_products.php   14 productos iniciales
└── img/                    Imágenes
    ├── productos/          Imágenes de productos subidas desde el panel
    └── catalogo/           Imágenes decorativas subidas desde el panel
```

## Paleta de colores

Todos los colores viven en `css/theme.css`. El sitio incluye dos paletas:

- **Azul clásico:** esquema original.
- **Rosa y lavanda:** tonos pastel para ropa de mujer, con textos oscuros para mantener el contraste.

La paleta se selecciona desde **Panel > Imágenes > Paleta del sitio**. La elección se guarda en `configuracion` y `js/theme.js` la aplica en todas las páginas. Para crear o ajustar una paleta edita únicamente los bloques de `css/theme.css`; los fondos, textos, bordes, sombras y estados se recalculan a partir de esos valores.

## Puesta en marcha

### 1. Base de datos

```bash
mysql -u root -p < sql/schema.sql
php sql/seed_admin.php
php sql/seed_products.php
```

### 2. Credenciales

Copia `api/config.local.example.php` como `api/config.local.php` y ajusta host, usuario y contraseña. Ese archivo está excluido de git.

### 3. Servidor

```bash
php -S localhost:8000
```

Visita `http://localhost:8000`.

## Acceso al panel

- URL: `http://localhost:8000/admin.html`
- Correo: `admin@frontendstore.com`
- Contraseña: `Admin123`

El panel está dividido en tres páginas: **Productos**, **Imágenes** y **Ventas**. Puedes cambiar estas credenciales con `php sql/seed_admin.php nuevo@email.com NuevaPassword`.

## Flujo de compra

1. Elige un producto en el catálogo.
2. Selecciona talla y cantidad.
3. Añade al carrito.
4. En el carrito introduce **nombre completo** y **teléfono** (obligatorios).
5. Pulsa "Finalizar Pedido". El backend registra cliente, pedido y detalles en MySQL.
6. El pedido aparece en **Registro de Ventas** del panel.

## Panel de administración

- **Productos:** alta, edición y eliminación con paginación de 10 productos por página. La imagen se sube desde el equipo (JPG, PNG o WebP, máximo 5 MB) y se guarda en `img/productos/`; al reemplazarla se elimina el archivo anterior si ya no lo usa otro producto.
- **Imágenes:** subida desde el equipo de las dos imágenes decorativas del catálogo (JPG, PNG o WebP, máximo 5 MB), con vista previa y eliminación del archivo anterior al reemplazarlo. También permite seleccionar la paleta del sitio.
- **Ventas:** registro con tres vistas y 15 resultados por página.

## Registro de ventas

- **Últimas ventas:** pedidos ordenados por fecha.
- **Pendientes:** únicamente pedidos con estado `Pendiente`.
- **Cliente frecuente:** todos los clientes con compras realizadas, productos adquiridos (unidades) y total gastado.
- **Producto más vendido:** pedidos ordenados por cantidad de unidades.
- El estado de cada pedido se puede cambiar desde la vista de últimas ventas.

## Fidelidad de clientes

- El teléfono identifica al cliente (`UNIQUE`).
- La primera compra se marca como **Cliente Nuevo**.
- A partir de la segunda aparece **N compras** y **Cliente Frecuente**.
- La consulta usa `COUNT(*) OVER (PARTITION BY cliente_id)` (MySQL 8+).

## Seguridad

- Contraseñas con `password_hash()` / `password_verify()`.
- Sesiones PHP con cookie `HttpOnly` y `SameSite=Lax`.
- Token CSRF en operaciones de administración.
- Consultas preparadas con PDO y `EMULATE_PREPARES = false`.
- El total del pedido se calcula en el servidor; nunca se confía en el precio del cliente.
