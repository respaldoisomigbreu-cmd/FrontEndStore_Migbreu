-- Esquema de FrontEnd Store para MySQL 8 / MariaDB 10.5+
-- Ejecutar con: mysql -u root -p < sql/schema.sql

CREATE DATABASE IF NOT EXISTS frontend_store
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE frontend_store;

CREATE TABLE IF NOT EXISTS administradores (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre        VARCHAR(120) NOT NULL DEFAULT 'Administrador',
    creado_en     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_admin_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS productos (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre         VARCHAR(120) NOT NULL,
    descripcion    TEXT NOT NULL,
    precio         DECIMAL(10,2) NOT NULL,
    imagen_url     VARCHAR(500) NOT NULL,
    activo         TINYINT(1) NOT NULL DEFAULT 1,
    creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT chk_producto_precio CHECK (precio > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS configuracion (
    clave         VARCHAR(60) NOT NULL,
    valor         VARCHAR(500) NOT NULL,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (clave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO configuracion (clave, valor) VALUES
    ('grafico_camisa', 'img/grafico1.jpg'),
    ('grafico_node', 'img/grafico2.jpg'),
    ('paleta', 'hombre')
ON DUPLICATE KEY UPDATE clave = clave;

CREATE TABLE IF NOT EXISTS producto_tallas (
    producto_id BIGINT UNSIGNED NOT NULL,
    talla       VARCHAR(10) NOT NULL,
    PRIMARY KEY (producto_id, talla),
    CONSTRAINT fk_talla_producto FOREIGN KEY (producto_id)
        REFERENCES productos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clientes (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre_completo VARCHAR(150) NOT NULL,
    telefono        VARCHAR(30) NOT NULL,
    fecha_registro  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_cliente_telefono (telefono)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pedidos (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    cliente_id   BIGINT UNSIGNED NOT NULL,
    total_pago   DECIMAL(10,2) NOT NULL,
    fecha_pedido TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado       ENUM('Pendiente','Completado','Cancelado') NOT NULL DEFAULT 'Pendiente',
    PRIMARY KEY (id),
    KEY idx_pedidos_cliente (cliente_id),
    KEY idx_pedidos_fecha (fecha_pedido),
    CONSTRAINT chk_pedido_total CHECK (total_pago >= 0),
    CONSTRAINT fk_pedido_cliente FOREIGN KEY (cliente_id)
        REFERENCES clientes(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS detalle_pedidos (
    id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    pedido_id          BIGINT UNSIGNED NOT NULL,
    producto_id        BIGINT UNSIGNED NOT NULL,
    talla_seleccionada VARCHAR(10) NOT NULL,
    cantidad           INT UNSIGNED NOT NULL,
    precio_unitario    DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_detalle_pedido (pedido_id),
    KEY idx_detalle_producto (producto_id),
    CONSTRAINT chk_detalle_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_detalle_precio CHECK (precio_unitario > 0),
    CONSTRAINT fk_detalle_pedido FOREIGN KEY (pedido_id)
        REFERENCES pedidos(id) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_producto FOREIGN KEY (producto_id)
        REFERENCES productos(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
