"""
Email sending abstraction.

Uses SMTP when SMTP_HOST is configured (see app/config.py). No credentials
are hardcoded anywhere — everything comes from environment variables. When
SMTP_HOST is unset (the default), emails are logged instead of sent, so the
rest of the app (Email Alerts, Weekly Digest) is fully wired end-to-end and
ready to go live the moment real SMTP credentials are supplied.
"""
import logging
import smtplib
from email.message import EmailMessage

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def send_email(to: str, subject: str, html_body: str, text_body: str | None = None) -> bool:
    """
    Sends an email to a single recipient. Returns True on success (or on
    successful log-only dev-mode "send"), False on failure. Never raises —
    callers (alert notifications, the digest scheduler) must be able to
    continue processing other users even if one send fails.
    """
    if not settings.email_enabled:
        logger.info("[email:dev-mode] Would send to %s — subject: %s", to, subject)
        return True

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to
    msg.set_content(text_body or "This email requires an HTML-capable client to view.")
    msg.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USERNAME:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to)
        return False
