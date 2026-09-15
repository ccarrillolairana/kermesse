# Guía de Configuración — Sistema de Gestión de Kermesse

Esta guía detalla los pasos para crear el archivo de Google Sheets y configurar el backend en Google Apps Script para el **Sistema de Gestión de Kermesse** (`kermesse.html`).

---

## Paso 1: Crear el Archivo de Google Sheets

1. Ve a [Google Sheets](https://sheets.google.com) y crea una nueva hoja de cálculo en blanco.
2. Nombra tu archivo (por ejemplo, `Sistema Kermesse - Base de Datos`).
3. El backend del sistema se encargará de **crear automáticamente las 17 pestañas** con sus correspondientes cabeceras y registros iniciales (usuarios, productos de muestra, categorías, tipos de pago, estados de pedido y métodos de entrega).

---

## Paso 2: Configurar Google Apps Script

1. En tu hoja de Google Sheets, ve al menú superior y selecciona **Extensiones > Apps Script**.
2. Copia todo el contenido del archivo local [`kermesse-google-apps-script.js`](file:///c:/xampp/htdocs/KERMESSE/kermesse-google-apps-script.js).
3. En el editor de Apps Script, reemplaza el contenido existente en `Código.gs` y pega el código copiado.
4. Nombra el proyecto como **Kermesse API**.
5. Haz clic en el botón de **Guardar** (icono de disquete).

---

## Paso 3: Desplegar la Aplicación Web

1. En la parte superior derecha de Apps Script, haz clic en **Implementar > Nueva implementación**.
2. Haz clic en el icono de engranaje al lado de "Seleccionar tipo" y elige **Aplicación web**.
3. Configura los siguientes campos:
   - **Descripción:** `Kermesse API v2.0`
   - **Ejecutar como:** `Yo (tu_correo@gmail.com)`
   - **Quién tiene acceso:** `Cualquiera`
4. Haz clic en **Implementar**.
5. Otorga los permisos solicitados por Google:
   - Haz clic en **Autorizar acceso**, selecciona tu cuenta, haz clic en **Avanzado > Ir a Kermesse API (no seguro)** y presiona **Permitir**.
6. Copia la **URL de la aplicación web** generada (terminada en `/exec`).

---

## Paso 4: Vincular la URL en el HTML local

1. Abre tu archivo local [`kermesse.html`](file:///c:/xampp/htdocs/KERMESSE/kermesse.html).
2. Busca la línea donde se define la variable `API_URL` (en la sección `<script>`):
   ```javascript
   const API_URL = "https://script.google.com/macros/s/TU_ID_DE_DESPLIEGUE/exec";
   ```
3. Reemplaza la URL por la de tu implementación de Google Apps Script.
4. Guarda el archivo [`kermesse.html`](file:///c:/xampp/htdocs/KERMESSE/kermesse.html) y ábrelo en el navegador.

---

## Credenciales por Defecto para Iniciar Sesión

| Rol | Correo | Contraseña |
|---|---|---|
| **Administrador** | `admin@kermesse.bo` | `demo1234` |
| **Cocina** | `cocina@kermesse.bo` | `demo1234` |
| **Repartidor** | `juan.perez@kermesse.bo` | `demo1234` |
| **Cajero** | `caja@kermesse.bo` | `demo1234` |
