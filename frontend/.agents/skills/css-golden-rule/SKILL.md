---
name: css-golden-rule
description: Regla de oro para el manejo de estilos y variables CSS globales del proyecto (Light y Dark mode).
---

# Regla de Oro: Parametrización de Colores y Variables CSS

Esta skill define la "regla de oro" obligatoria para trabajar con estilos CSS dentro del proyecto.

## 1. Nunca usar colores en duro (Hex/RGB/RGBA)
Está **estrictamente prohibido** utilizar colores directamente (ej. `color: #333333;` o `background: rgba(0,0,0,0.1);`) en los archivos `.css` de los componentes individuales (por ejemplo: `navbar.component.css`, `lesson.component.css`, etc.).

## 2. Todo debe provenir de styles.css
Toda la paleta de colores de la aplicación está centralizada en el archivo global `styles.css`.
- Las variables por defecto (Dark Mode / Globales) se definen dentro de `:root` (o `[data-theme="dark"]`).
- Las variables para el modo claro (Light Mode) se reescriben dentro del bloque `:root` principal si este es el por defecto, o dentro del bloque respectivo (ej. `[data-theme="light"]`).

## 3. Variables de uso obligatorio

Al maquetar componentes, **siempre** debes utilizar las siguientes variables nativas con la función `var()`:

### Fondos y Superficies
- `var(--bg-main)`: Fondo general de las vistas y pantallas.
- `var(--bg-card)`: Fondo para tarjetas, modales y contenedores principales.
- `var(--bg-card-hover)`: Hover sutil sobre tarjetas.
- `var(--bg-surface)` / `var(--bg-surface-elevated)`: Superficies elevadas (dropdowns, navbars).

### Interacciones
- `var(--bg-input)`: Fondo para inputs.
- `var(--bg-hover)`: Hover estándar para items de lista o filas.
- `var(--bg-hover-strong)`: Hover fuerte para elementos activos.
- `var(--bg-disabled)`: Fondo grisáceo para elementos deshabilitados.

### Textos
- `var(--text-primary)`: Textos principales, títulos, contraste alto.
- `var(--text-secondary)`: Texto base de párrafos, contraste medio.
- `var(--text-muted)`: Texto secundario, descripciones, fechas.
- `var(--text-on-primary)`: Textos/Íconos que van DENTRO de un fondo primario (ej. un botón azul).
- `var(--text-disabled)`: Texto grisáceo para elementos deshabilitados.

### Bordes y Sombras
- `var(--border-subtle)`: Bordes de tarjetas, separadores.
- `var(--border-active)`: Borde resaltado.
- `var(--shadow-sm)`, `var(--shadow-md)`, `var(--shadow-lg)`: Sombras.

### Marca y Estados
- `var(--primary)`: Color principal de acento (marca).
- `var(--primary-hover)` / `var(--primary-light)`: Variaciones del color primario.
- `var(--status-completed)`, `var(--status-completed-bg)`, `var(--badge-completed-text)`: Para estados de éxito (verde).
- `var(--status-danger)`, `var(--status-danger-bg)`, `var(--status-danger-hover)`: Para estados de peligro/error (rojo).
- `var(--status-warning)`: Para alertas (naranja/amarillo).
- `var(--status-available)` / `var(--status-locked)`: Estados de disponibilidad.

## 4. ¿Qué hacer si falta un color?
Si te encuentras maquetando y necesitas un color que no está cubierto por estas variables:
1. **NO lo agregues en duro en el componente local**.
2. Dirígete a `styles.css`.
3. Crea la nueva variable de forma global (tanto en el modo oscuro como en el modo claro, si están separados).
4. Aplícalo al componente usando `var(--nueva-variable)`. 
