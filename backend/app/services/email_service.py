import smtplib
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape

from app.core.config import settings


# =============================================================================
# HERDSENSE AI — EMAIL SERVICE
# =============================================================================


SMTP_TIMEOUT_SECONDS = 30


def _validate_smtp_configuration() -> None:
    """
    Validate the minimum SMTP configuration required to send email.

    Raises:
        RuntimeError: If required SMTP settings are missing.
    """

    if not settings.SMTP_HOST:
        raise RuntimeError(
            "SMTP_HOST is not configured."
        )

    if not settings.SMTP_PORT:
        raise RuntimeError(
            "SMTP_PORT is not configured."
        )

    if not settings.SMTP_USERNAME:
        raise RuntimeError(
            "SMTP_USERNAME is not configured."
        )

    if not settings.SMTP_PASSWORD:
        raise RuntimeError(
            "SMTP_PASSWORD is not configured."
        )


def send_email(
    recipient: str,
    subject: str,
    html_body: str,
) -> None:
    """
    Send an HTML email through the configured SMTP server.

    SMTP credentials are never included in raised errors or logs.
    """

    _validate_smtp_configuration()

    sender = (
        settings.SMTP_FROM_EMAIL
        or settings.SMTP_USERNAME
    )

    if not sender:
        raise RuntimeError(
            "SMTP sender email is not configured."
        )

    if not recipient:
        raise ValueError(
            "Email recipient is required."
        )

    if not subject:
        raise ValueError(
            "Email subject is required."
        )

    if not html_body:
        raise ValueError(
            "Email body is required."
        )

    message = MIMEMultipart("alternative")

    message["Subject"] = str(
        Header(
            subject,
            "utf-8",
        )
    )

    message["From"] = sender
    message["To"] = recipient

    message.attach(
        MIMEText(
            html_body,
            "html",
            "utf-8",
        )
    )

    try:

        with smtplib.SMTP(
            settings.SMTP_HOST,
            settings.SMTP_PORT,
            timeout=SMTP_TIMEOUT_SECONDS,
        ) as server:

            server.ehlo()

            server.starttls()

            server.ehlo()

            server.login(
                settings.SMTP_USERNAME,
                settings.SMTP_PASSWORD,
            )

            server.sendmail(
                sender,
                [recipient],
                message.as_string(),
            )

    except smtplib.SMTPAuthenticationError as exc:

        raise RuntimeError(
            "SMTP authentication failed. "
            "Verify the SMTP username and Google App Password."
        ) from exc

    except smtplib.SMTPConnectError as exc:

        raise RuntimeError(
            "Unable to connect to the SMTP server."
        ) from exc

    except smtplib.SMTPServerDisconnected as exc:

        raise RuntimeError(
            "The SMTP server disconnected unexpectedly."
        ) from exc

    except smtplib.SMTPException as exc:

        raise RuntimeError(
            "The SMTP server rejected the email request."
        ) from exc

    except TimeoutError as exc:

        raise RuntimeError(
            "SMTP connection timed out."
        ) from exc

    except OSError as exc:

        raise RuntimeError(
            "Unable to reach the SMTP server."
        ) from exc


# =============================================================================
# VERIFICATION EMAIL
# =============================================================================


def send_verification_email(
    recipient: str,
    full_name: str,
    verification_url: str,
) -> None:
    """
    Send the HerdSense AI account verification email.
    """

    safe_name = escape(
        full_name.strip()
    )

    safe_verification_url = escape(
        verification_url,
        quote=True,
    )

    subject = (
        "Verify your HerdSense AI account"
    )

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
        >
        <title>Verify your HerdSense AI account</title>
    </head>

    <body style="
        margin:0;
        padding:40px 20px;
        background:#050505;
        color:#f5f5f5;
        font-family:Arial,Helvetica,sans-serif;
    ">

        <div style="
            max-width:560px;
            margin:0 auto;
            background:#101010;
            border:1px solid #252525;
            padding:40px;
        ">

            <div style="
                font-size:22px;
                font-weight:700;
                letter-spacing:-0.3px;
                margin-bottom:30px;
            ">
                HerdSense AI
            </div>

            <div style="
                color:#28d65c;
                font-size:11px;
                font-weight:700;
                letter-spacing:2px;
                margin-bottom:12px;
            ">
                EMAIL VERIFICATION
            </div>

            <h1 style="
                font-size:30px;
                line-height:1.2;
                margin:0 0 16px;
                color:#f5f5f5;
            ">
                Verify your account.
            </h1>

            <p style="
                color:#a1a1a1;
                line-height:1.7;
                font-size:14px;
                margin:0 0 16px;
            ">
                Hello {safe_name},
            </p>

            <p style="
                color:#a1a1a1;
                line-height:1.7;
                font-size:14px;
                margin:0 0 16px;
            ">
                Your HerdSense AI account has been created.
                Please verify your email address before
                accessing the platform.
            </p>

            <div style="margin:30px 0;">

                <a
                    href="{safe_verification_url}"
                    style="
                        display:inline-block;
                        padding:14px 22px;
                        background:#ffffff;
                        color:#050505;
                        text-decoration:none;
                        font-weight:700;
                        font-size:13px;
                        border-radius:2px;
                    "
                >
                    Verify email address
                </a>

            </div>

            <p style="
                color:#686868;
                font-size:11px;
                line-height:1.6;
                margin:0 0 10px;
            ">
                This verification link expires after 24 hours.
            </p>

            <p style="
                color:#686868;
                font-size:11px;
                line-height:1.6;
                margin:0;
            ">
                If you did not create this account,
                you can safely ignore this email.
            </p>

        </div>

    </body>
    </html>
    """

    send_email(
        recipient=recipient,
        subject=subject,
        html_body=html,
    )


# =============================================================================
# PASSWORD RESET EMAIL
# =============================================================================


def send_password_reset_email(
    recipient: str,
    full_name: str,
    reset_url: str,
) -> None:
    """
    Send the HerdSense AI password reset email.
    """

    safe_name = escape(
        full_name.strip()
    )

    safe_reset_url = escape(
        reset_url,
        quote=True,
    )

    subject = (
        "Reset your HerdSense AI password"
    )

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
        >
        <title>Reset your HerdSense AI password</title>
    </head>

    <body style="
        margin:0;
        padding:40px 20px;
        background:#050505;
        color:#f5f5f5;
        font-family:Arial,Helvetica,sans-serif;
    ">

        <div style="
            max-width:560px;
            margin:0 auto;
            background:#101010;
            border:1px solid #252525;
            padding:40px;
        ">

            <div style="
                font-size:22px;
                font-weight:700;
                letter-spacing:-0.3px;
                margin-bottom:30px;
            ">
                HerdSense AI
            </div>

            <div style="
                color:#ffffff;
                font-size:11px;
                font-weight:700;
                letter-spacing:2px;
                margin-bottom:12px;
            ">
                PASSWORD RESET
            </div>

            <h1 style="
                font-size:30px;
                line-height:1.2;
                margin:0 0 16px;
                color:#f5f5f5;
            ">
                Reset your password.
            </h1>

            <p style="
                color:#a1a1a1;
                line-height:1.7;
                font-size:14px;
                margin:0 0 16px;
            ">
                Hello {safe_name},
            </p>

            <p style="
                color:#a1a1a1;
                line-height:1.7;
                font-size:14px;
                margin:0 0 16px;
            ">
                We received a request to reset your
                HerdSense AI password.
            </p>

            <div style="margin:30px 0;">

                <a
                    href="{safe_reset_url}"
                    style="
                        display:inline-block;
                        padding:14px 22px;
                        background:#ffffff;
                        color:#050505;
                        text-decoration:none;
                        font-weight:700;
                        font-size:13px;
                        border-radius:2px;
                    "
                >
                    Reset password
                </a>

            </div>

            <p style="
                color:#686868;
                font-size:11px;
                line-height:1.6;
                margin:0 0 10px;
            ">
                This password-reset link expires after 30 minutes.
            </p>

            <p style="
                color:#686868;
                font-size:11px;
                line-height:1.6;
                margin:0;
            ">
                If you did not request this reset,
                you can safely ignore this email.
            </p>

        </div>

    </body>
    </html>
    """

    send_email(
        recipient=recipient,
        subject=subject,
        html_body=html,
    )