# DBS P&L V79 — Render MULTIUSUARIO

Esta versión ya **no es un Static Site**.

Es una aplicación web dinámica con:
- Flask + Gunicorn.
- Login por usuario.
- Roles: `admin`, `editor`, `viewer`.
- PostgreSQL persistente.
- Administración de usuarios.
- Estado compartido de la balanza: cuando un admin/editor actualiza el Real, todos los usuarios ven la misma base.
- Auditoría básica de accesos y actualizaciones.

## Qué ve cada rol

### Viewer
Puede consultar Dashboard, P&L, Direcciones, Comparativo, Datos, Catálogos y Revisión.
No puede actualizar la balanza.

### Editor
Todo lo anterior + puede cargar una nueva balanza.
La balanza procesada queda guardada en PostgreSQL y se comparte con todos.

### Admin
Todo lo anterior + puede:
- crear usuarios,
- activar/desactivar usuarios,
- cambiar contraseñas,
- restaurar la base original.

## Despliegue en Render

1. Descomprime esta carpeta.
2. Sube todos los archivos a un repositorio de GitHub.
3. En Render selecciona **New > Blueprint**.
4. Conecta el repositorio.
5. Render detectará `render.yaml`.
6. Antes de crear, Render te pedirá los valores de:
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
7. Se crearán:
   - un Web Service Python,
   - una base PostgreSQL.
8. Entra a la URL de Render con el admin que definiste.

## IMPORTANTE

No crear esto como Static Site. Debe ser un **Web Service**.

La configuración incluida usa:
- Web Service: `starter`
- PostgreSQL: `basic_256mb`

Puedes cambiar los planes desde `render.yaml` antes de desplegar.

## Variables

- `DATABASE_URL`: Render la conecta automáticamente con Postgres.
- `SECRET_KEY`: Render la genera.
- `ADMIN_EMAIL`: correo del primer administrador.
- `ADMIN_PASSWORD`: contraseña inicial del primer administrador.
- `ADMIN_NAME`: nombre visible del admin.

## Desarrollo local

Instala:
```bash
pip install -r requirements.txt
```

Puedes ejecutar localmente con SQLite:
```bash
set SECRET_KEY=dev-secret
set ADMIN_EMAIL=admin@empresa.com
set ADMIN_PASSWORD=Cambiar123!
python app.py
```

En macOS/Linux usa `export` en lugar de `set`.
