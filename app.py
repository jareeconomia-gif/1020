import os
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path

from flask import Flask, jsonify, redirect, render_template, request, url_for, flash
from flask_login import LoginManager, UserMixin, current_user, login_required, login_user, logout_user
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import IntegrityError
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = Path(__file__).resolve().parent
app = Flask(__name__, template_folder=str(BASE_DIR))
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

database_url = os.environ.get("DATABASE_URL", "sqlite:///local.db")
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config.update(
    SECRET_KEY=os.environ.get("SECRET_KEY", "dev-change-me"),
    SQLALCHEMY_DATABASE_URI=database_url,
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    SQLALCHEMY_ENGINE_OPTIONS={"pool_pre_ping": True},
    MAX_CONTENT_LENGTH=40 * 1024 * 1024,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=bool(os.environ.get("RENDER")),
    REMEMBER_COOKIE_HTTPONLY=True,
    REMEMBER_COOKIE_SECURE=bool(os.environ.get("RENDER")),
)

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = "login"
login_manager.login_message = "Inicia sesión para entrar al P&L."
login_manager.login_message_category = "info"


def utcnow():
    return datetime.now(timezone.utc)


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(160), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(30), nullable=False, default="viewer")
    active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    last_login_at = db.Column(db.DateTime(timezone=True), nullable=True)

    @property
    def is_active(self):
        return bool(self.active)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class SharedState(db.Model):
    id = db.Column(db.Integer, primary_key=True, default=1)
    actual_rows = db.Column(db.JSON, nullable=True)
    uploaded_name = db.Column(db.String(255), nullable=True)
    updated_by_email = db.Column(db.String(255), nullable=True)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=True)
    version = db.Column(db.Integer, nullable=False, default=0)


class AuditLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_email = db.Column(db.String(255), nullable=True, index=True)
    action = db.Column(db.String(120), nullable=False)
    detail = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)


@login_manager.user_loader
def load_user(user_id):
    try:
        return db.session.get(User, int(user_id))
    except Exception:
        return None


def log_action(action, detail=None):
    db.session.add(AuditLog(
        user_email=current_user.email if current_user.is_authenticated else None,
        action=action,
        detail=detail,
    ))
    db.session.commit()


def roles_required(*roles):
    def decorator(fn):
        @wraps(fn)
        @login_required
        def wrapped(*args, **kwargs):
            if current_user.role not in roles:
                if request.path.startswith("/api/"):
                    return jsonify({"error": "No tienes permisos para esta acción."}), 403
                flash("No tienes permisos para esta sección.", "error")
                return redirect(url_for("dashboard"))
            return fn(*args, **kwargs)
        return wrapped
    return decorator


def bootstrap():
    db.create_all()
    admin_email = (os.environ.get("ADMIN_EMAIL") or "").strip().lower()
    admin_password = os.environ.get("ADMIN_PASSWORD") or ""
    admin_name = os.environ.get("ADMIN_NAME") or "Administrador DBS"
    if admin_email and admin_password and not User.query.filter_by(email=admin_email).first():
        u = User(email=admin_email, name=admin_name, role="admin", active=True)
        u.set_password(admin_password)
        db.session.add(u)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()


with app.app_context():
    bootstrap()


@app.get("/health")
def health():
    return {"ok": True, "service": "dbs-pnl-multiuser"}, 200


@app.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard"))
    if request.method == "POST":
        username = (request.form.get("email") or "").strip().lower()
        password = request.form.get("password") or ""
        user = User.query.filter_by(email=username).first()
        if not user or not user.active or not user.check_password(password):
            flash("Usuario o contraseña incorrectos.", "error")
            return render_template("login.html"), 401
        login_user(user, remember=True)
        user.last_login_at = utcnow()
        db.session.commit()
        log_action("login")
        return redirect(url_for("dashboard"))
    return render_template("login.html")


@app.get("/logout")
@login_required
def logout():
    email = current_user.email
    logout_user()
    db.session.add(AuditLog(user_email=email, action="logout"))
    db.session.commit()
    return redirect(url_for("login"))


@app.get("/")
@login_required
def dashboard():
    html = (BASE_DIR / "index.html").read_text(encoding="utf-8")
    loader = """
<script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
<script>
if (typeof JSZip === 'undefined') {
  document.write('<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"><\\/script>');
}
</script>
"""
    if "cdn.jsdelivr.net/npm/jszip@3.10.1" not in html:
        html = html.replace("</head>", loader + "\n</head>", 1)

    # UI productiva: únicamente Dashboard, P&L, Comparativo y Datos.
    ui_override_path = BASE_DIR / "ui_simplify.js"
    if ui_override_path.exists():
        ui_override = ui_override_path.read_text(encoding="utf-8")
        html = html.replace("</body>", f"\n<script>\n{ui_override}\n</script>\n</body>", 1)

    # Los filtros del Dashboard son globales para P&L y Comparativo.
    global_filters_path = BASE_DIR / "global_filters.js"
    if global_filters_path.exists():
        global_filters = global_filters_path.read_text(encoding="utf-8")
        html = html.replace("</body>", f"\n<script>\n{global_filters}\n</script>\n</body>", 1)

    return app.response_class(html, mimetype="text/html")


@app.get("/api/me")
@login_required
def api_me():
    return jsonify({
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role,
    })


@app.get("/api/state")
@login_required
def get_shared_state():
    state = db.session.get(SharedState, 1)
    if not state or not state.actual_rows:
        return jsonify({
            "actual_rows": None,
            "uploaded_name": None,
            "version": 0,
            "updated_at": None,
            "updated_by": None,
        })
    return jsonify({
        "actual_rows": state.actual_rows,
        "uploaded_name": state.uploaded_name,
        "version": state.version,
        "updated_at": state.updated_at.isoformat() if state.updated_at else None,
        "updated_by": state.updated_by_email,
    })


@app.post("/api/state")
@roles_required("admin", "editor")
def save_shared_state():
    payload = request.get_json(silent=True) or {}
    rows = payload.get("actual_rows")
    uploaded_name = (payload.get("uploaded_name") or "")[:255]
    if not isinstance(rows, list) or not rows:
        return jsonify({"error": "La balanza procesada no contiene movimientos válidos."}), 400
    if len(rows) > 250000:
        return jsonify({"error": "La balanza excede el límite de movimientos permitido."}), 413
    state = db.session.get(SharedState, 1)
    if not state:
        state = SharedState(id=1, version=0)
        db.session.add(state)
    state.actual_rows = rows
    state.uploaded_name = uploaded_name
    state.updated_by_email = current_user.email
    state.updated_at = utcnow()
    state.version = (state.version or 0) + 1
    db.session.add(AuditLog(
        user_email=current_user.email,
        action="actualizar_balanza",
        detail=f"{uploaded_name} · {len(rows)} movimientos · versión {state.version}",
    ))
    db.session.commit()
    return jsonify({"ok": True, "version": state.version})


@app.post("/api/state/reset")
@roles_required("admin")
def reset_shared_state():
    state = db.session.get(SharedState, 1)
    if state:
        db.session.delete(state)
    db.session.add(AuditLog(user_email=current_user.email, action="restaurar_base_original"))
    db.session.commit()
    return jsonify({"ok": True})


@app.get("/admin/users")
@roles_required("admin")
def admin_users():
    return render_template("admin_users.html", users=User.query.order_by(User.created_at.asc()).all())


@app.post("/admin/users/create")
@roles_required("admin")
def admin_create_user():
    email = (request.form.get("email") or "").strip().lower()
    name = (request.form.get("name") or "").strip()
    password = request.form.get("password") or ""
    role = request.form.get("role") or "viewer"
    if role not in {"admin", "editor", "viewer"}:
        role = "viewer"
    if not email or not name or len(password) < 8:
        flash("Completa nombre, usuario y una contraseña de al menos 8 caracteres.", "error")
        return redirect(url_for("admin_users"))
    if User.query.filter_by(email=email).first():
        flash("Ese usuario ya existe.", "error")
        return redirect(url_for("admin_users"))
    user = User(email=email, name=name, role=role, active=True)
    user.set_password(password)
    db.session.add(user)
    db.session.add(AuditLog(user_email=current_user.email, action="crear_usuario", detail=f"{email} · {role}"))
    db.session.commit()
    flash("Usuario creado.", "ok")
    return redirect(url_for("admin_users"))


@app.post("/admin/users/<int:user_id>/toggle")
@roles_required("admin")
def admin_toggle_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        flash("Usuario no encontrado.", "error")
        return redirect(url_for("admin_users"))
    if user.id == current_user.id:
        flash("No puedes desactivar tu propio usuario.", "error")
        return redirect(url_for("admin_users"))
    user.active = not user.active
    db.session.add(AuditLog(
        user_email=current_user.email,
        action="cambiar_estado_usuario",
        detail=f"{user.email} · {'activo' if user.active else 'inactivo'}",
    ))
    db.session.commit()
    return redirect(url_for("admin_users"))


@app.post("/admin/users/<int:user_id>/password")
@roles_required("admin")
def admin_change_password(user_id):
    user = db.session.get(User, user_id)
    password = request.form.get("password") or ""
    if not user:
        flash("Usuario no encontrado.", "error")
    elif len(password) < 8:
        flash("La contraseña debe tener al menos 8 caracteres.", "error")
    else:
        user.set_password(password)
        db.session.add(AuditLog(user_email=current_user.email, action="cambiar_password_usuario", detail=user.email))
        db.session.commit()
        flash("Contraseña actualizada.", "ok")
    return redirect(url_for("admin_users"))


@app.errorhandler(413)
def too_large(_):
    return jsonify({"error": "La carga es demasiado grande."}), 413


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)), debug=True)
