import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from app.core.config import settings

logger = logging.getLogger("email_service")

class EmailService:
    @staticmethod
    def _send_email(to_email: str, subject: str, body_html: str, body_text: str) -> None:
        """
        Envia un correo electrónico. En entorno de desarrollo o si no hay servidor SMTP
        configurado, imprime la notificación estructurada en logs (Modo Mock).
        """
        # Verificar si hay servidor SMTP configurado en entorno
        smtp_server = getattr(settings, "SMTP_SERVER", None)
        smtp_port = getattr(settings, "SMTP_PORT", 587)
        smtp_user = getattr(settings, "SMTP_USER", None)
        smtp_password = getattr(settings, "SMTP_PASSWORD", None)

        if not smtp_server or not smtp_user:
            logger.info("================================================================================")
            logger.info(f" [MOCK EMAIL DISPATCH] To: {to_email}")
            logger.info(f" Subject: {subject}")
            logger.info(f" Content (Text):\n{body_text}")
            logger.info("================================================================================")
            print(f"\n[EMAIL SENT (MOCK)] To: {to_email} | Subject: {subject}\nBody Preview:\n{body_text[:150]}...\n")
            return

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = smtp_user
            msg["To"] = to_email

            msg.attach(MIMEText(body_text, "plain"))
            msg.attach(MIMEText(body_html, "html"))

            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, to_email, msg.as_string())
            
            logger.info(f"Email enviado exitosamente a {to_email}")
        except Exception as e:
            logger.error(f"Error al enviar correo SMTP: {e}")

    @classmethod
    def send_inspection_edited_email(
        cls,
        gerente_email: str,
        coordinador_nombre: str,
        vehiculo_patente: str,
        inspeccion_id: str,
        diff: dict
    ) -> None:
        """Envía una notificación al gerente cuando una inspección es editada."""
        subject = f"⚠️ Notificación: Inspección Modificada — Vehículo {vehiculo_patente}"
        
        cambios_str = ""
        if "antes" in diff and "despues" in diff:
            for campo in diff["despues"].keys():
                val_antes = diff["antes"].get(campo, "N/A")
                val_despues = diff["despues"].get(campo, "N/A")
                cambios_str += f" - {campo}: '{val_antes}' → '{val_despues}'\n"

        body_text = f"""
Estimado Gerente,

Le informamos que un reporte de inspección ha sido MODIFICADO.

Detalles de la Acción:
----------------------
• Vehículo (Patente): {vehiculo_patente}
• ID de Inspección: {inspeccion_id}
• Coordinador Responsable: {coordinador_nombre}

Modificaciones Realizadas:
{cambios_str}

Este mensaje ha sido generado automáticamente por el Sistema de Inspección de Flota.
"""

        body_html = f"""
<html>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <h2 style="color: #d9534f;">⚠️ Notificación de Modificación de Registro</h2>
    <p>Estimado Gerente,</p>
    <p>Le informamos que el siguiente reporte de inspección fue <strong>modificado</strong> en el sistema:</p>
    <ul>
        <li><strong>Vehículo (Patente):</strong> {vehiculo_patente}</li>
        <li><strong>ID Inspección:</strong> <code>{inspeccion_id}</code></li>
        <li><strong>Coordinador:</strong> {coordinador_nombre}</li>
    </ul>
    <h3>Detalle de los Cambios:</h3>
    <pre style="background: #f8f9fa; padding: 10px; border-left: 4px solid #d9534f;">{cambios_str}</pre>
    <p style="font-size: 0.9em; color: #777;">Sistema de Inspección de Flota Vehicular.</p>
</body>
</html>
"""
        cls._send_email(gerente_email, subject, body_html, body_text)

    @classmethod
    def send_inspection_deleted_email(
        cls,
        gerente_email: str,
        coordinador_nombre: str,
        vehiculo_patente: str,
        inspeccion_id: str,
        fecha_original: str
    ) -> None:
        """Envía una notificación al gerente cuando una inspección es eliminada (Soft Delete)."""
        subject = f"🚨 ALERTA: Inspección Eliminada — Vehículo {vehiculo_patente}"

        body_text = f"""
Estimado Gerente,

ALERTA DE ELIMINACIÓN DE REGISTRO.

Un reporte de inspección ha sido ELIMINADO de la plataforma.

Detalles del Evento:
--------------------
• Vehículo (Patente): {vehiculo_patente}
• ID de Inspección: {inspeccion_id}
• Fecha de Inspección Original: {fecha_original}
• Coordinador que Elimina: {coordinador_nombre}

Este evento ha sido registrado en la Bitácora de Auditoría (AuditLog).
"""

        body_html = f"""
<html>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <h2 style="color: #c9302c;">🚨 Alerta de Eliminación de Inspección</h2>
    <p>Estimado Gerente,</p>
    <p>Un reporte de inspección ha sido <strong>eliminado</strong> por un coordinador:</p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <tr><td style="padding: 6px; font-weight: bold;">Vehículo (Patente):</td><td>{vehiculo_patente}</td></tr>
        <tr><td style="padding: 6px; font-weight: bold;">ID Inspección:</td><td><code>{inspeccion_id}</code></td></tr>
        <tr><td style="padding: 6px; font-weight: bold;">Fecha Registro:</td><td>{fecha_original}</td></tr>
        <tr><td style="padding: 6px; font-weight: bold;">Eliminado por:</td><td>{coordinador_nombre}</td></tr>
    </table>
    <p style="margin-top: 15px; font-size: 0.9em; color: #777;">Este evento ha sido guardado de forma permanente en el AuditLog de la base de datos.</p>
</body>
</html>
"""
        cls._send_email(gerente_email, subject, body_html, body_text)
