from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape
import smtplib
import ssl

from app.core.config import settings


# =============================================================================
# HERDSENSE AI — EMAIL SERVICE
# Brevo SMTP transactional email implementation
# =============================================================================


# =============================================================================
# CONFIGURATION VALIDATION
# =============================================================================


def _validate_smtp_configuration() -> None:
    """
    Validate the minimum configuration required to send email
    through the configured SMTP provider.
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

    if not settings.SMTP_FROM_EMAIL:
        raise RuntimeError(
            "SMTP_FROM_EMAIL is not configured."
        )


# =============================================================================
# RECIPIENT VALIDATION
# =============================================================================


def _validate_recipient(recipient: str) -> str:
    """
    Validate and normalize the recipient email address.
    """

    recipient = recipient.strip()

    if not recipient:
        raise ValueError(
            "Email recipient is required."
        )

    if "@" not in recipient:
        raise ValueError(
            "Invalid email recipient."
        )

    return recipient


# =============================================================================
# SMTP EMAIL SENDER
# =============================================================================


def _send_email(
    recipient: str,
    subject: str,
    html_body: str,
) -> None:
    """
    Send a transactional HTML email through Brevo SMTP.

    Uses STARTTLS on the configured SMTP port.
    """

    _validate_smtp_configuration()

    recipient = _validate_recipient(recipient)

    subject = subject.strip()

    if not subject:
        raise ValueError(
            "Email subject is required."
        )

    if not html_body.strip():
        raise ValueError(
            "Email body is required."
        )

    message = MIMEMultipart("alternative")

    message["From"] = settings.SMTP_FROM_EMAIL

    message["To"] = recipient

    message["Subject"] = subject

    # -------------------------------------------------------------------------
    # HTML MESSAGE
    # -------------------------------------------------------------------------

    html_part = MIMEText(
        html_body,
        "html",
        "utf-8",
    )

    message.attach(html_part)

    # -------------------------------------------------------------------------
    # SMTP CONNECTION
    # -------------------------------------------------------------------------

    try:
        context = ssl.create_default_context()

        with smtplib.SMTP(
            settings.SMTP_HOST,
            settings.SMTP_PORT,
            timeout=20,
        ) as server:

            # -------------------------------------------------------------
            # Identify ourselves to the SMTP server
            # -------------------------------------------------------------

            server.ehlo()

            # -------------------------------------------------------------
            # Upgrade connection to TLS
            # -------------------------------------------------------------

            server.starttls(
                context=context
            )

            server.ehlo()

            # -------------------------------------------------------------
            # Authenticate with Brevo
            # -------------------------------------------------------------

            server.login(
                settings.SMTP_USERNAME,
                settings.SMTP_PASSWORD,
            )

            # -------------------------------------------------------------
            # Send message
            # -------------------------------------------------------------

            server.sendmail(
                settings.SMTP_FROM_EMAIL,
                [recipient],
                message.as_string(),
            )

        print(
            "📧 HerdSense AI: "
            f"Email sent successfully to {recipient}"
        )

    except smtplib.SMTPAuthenticationError as exc:

        print(
            "❌ HerdSense AI SMTP authentication error:",
            repr(exc),
        )

        raise RuntimeError(
            "Unable to authenticate with the SMTP email provider."
        ) from exc

    except smtplib.SMTPConnectError as exc:

        print(
            "❌ HerdSense AI SMTP connection error:",
            repr(exc),
        )

        raise RuntimeError(
            "Unable to connect to the SMTP email provider."
        ) from exc

    except smtplib.SMTPException as exc:

        print(
            "❌ HerdSense AI SMTP error:",
            repr(exc),
        )

        raise RuntimeError(
            "Unable to send email through SMTP."
        ) from exc

    except TimeoutError as exc:

        print(
            "❌ HerdSense AI SMTP timeout:",
            repr(exc),
        )

        raise RuntimeError(
            "SMTP email provider connection timed out."
        ) from exc

    except OSError as exc:

        print(
            "❌ HerdSense AI SMTP network error:",
            repr(exc),
        )

        raise RuntimeError(
            "Unable to reach the SMTP email provider."
        ) from exc

    except Exception as exc:

        print(
            "❌ HerdSense AI email error:",
            repr(exc),
        )

        raise RuntimeError(
            "Unable to send email."
        ) from exc


# =============================================================================
# PUBLIC EMAIL SERVICE
# =============================================================================


def send_email(
    recipient: str,
    subject: str,
    html_body: str,
) -> None:
    """
    Public email service interface.

    Authentication code should call this function instead of
    knowing which email provider is being used.
    """

    _send_email(
        recipient=recipient,
        subject=subject,
        html_body=html_body,
    )


# =============================================================================
# EMAIL VERIFICATION
# =============================================================================


def send_verification_email(
    recipient: str,
    full_name: str,
    verification_url: str,
) -> None:
    """
    Send a HerdSense AI email verification message.
    """

    safe_name = escape(
        full_name or "there"
    )

    safe_url = escape(
        verification_url,
        quote=True,
    )

    subject = (
        "Verify your HerdSense AI account"
    )

    html_body = f"""
<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        Verify your HerdSense AI account
    </title>
</head>

<body style="
    margin:0;
    padding:0;
    background:#050505;
    color:#f5f7f5;
    font-family:Arial,Helvetica,sans-serif;
">

<table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
        background:#050505;
        padding:40px 20px;
    "
>

    <tr>

        <td align="center">

            <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                    max-width:620px;
                    background:#0b0d0d;
                    border:1px solid #1b2420;
                    border-radius:16px;
                    overflow:hidden;
                "
            >

                <tr>

                    <td
                        style="
                            padding:36px 36px 20px 36px;
                        "
                    >

                        <div
                            style="
                                font-size:12px;
                                font-weight:700;
                                letter-spacing:2px;
                                color:#38d996;
                                text-transform:uppercase;
                                margin-bottom:14px;
                            "
                        >
                            HERDSENSE AI
                        </div>

                        <h1
                            style="
                                margin:0;
                                color:#f5f7f5;
                                font-size:30px;
                                line-height:1.2;
                            "
                        >
                            Verify your account
                        </h1>

                    </td>

                </tr>

                <tr>

                    <td
                        style="
                            padding:0 36px 36px 36px;
                        "
                    >

                        <p
                            style="
                                color:#c5ccc8;
                                font-size:16px;
                                line-height:1.7;
                                margin:0 0 20px 0;
                            "
                        >
                            Hello {safe_name},
                        </p>

                        <p
                            style="
                                color:#aeb8b3;
                                font-size:15px;
                                line-height:1.7;
                                margin:0 0 28px 0;
                            "
                        >
                            Welcome to HerdSense AI.
                            Please verify your email address
                            to activate your account.
                        </p>

                        <table
                            cellpadding="0"
                            cellspacing="0"
                            border="0"
                        >

                            <tr>

                                <td>

                                    <a
                                        href="{safe_url}"
                                        style="
                                            display:inline-block;
                                            padding:14px 24px;
                                            background:#38d996;
                                            color:#04110b;
                                            text-decoration:none;
                                            border-radius:9px;
                                            font-weight:700;
                                            font-size:14px;
                                        "
                                    >
                                        Verify Email
                                    </a>

                                </td>

                            </tr>

                        </table>

                        <p
                            style="
                                color:#6f7b75;
                                font-size:13px;
                                line-height:1.6;
                                margin:28px 0 0 0;
                            "
                        >
                            This verification link expires
                            after 24 hours.
                        </p>

                    </td>

                </tr>

            </table>

            <p
                style="
                    max-width:620px;
                    color:#56605b;
                    font-size:12px;
                    line-height:1.6;
                    margin:18px auto 0 auto;
                "
            >
                HerdSense AI — Livestock Intelligence Platform
            </p>

        </td>

    </tr>

</table>

</body>

</html>
"""

    send_email(
        recipient=recipient,
        subject=subject,
        html_body=html_body,
    )


# =============================================================================
# PASSWORD RESET
# =============================================================================


def send_password_reset_email(
    recipient: str,
    full_name: str,
    reset_url: str,
) -> None:
    """
    Send a HerdSense AI password reset message.
    """

    safe_name = escape(
        full_name or "there"
    )

    safe_url = escape(
        reset_url,
        quote=True,
    )

    subject = (
        "Reset your HerdSense AI password"
    )

    html_body = f"""
<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        Reset your HerdSense AI password
    </title>
</head>

<body style="
    margin:0;
    padding:0;
    background:#050505;
    color:#f5f7f5;
    font-family:Arial,Helvetica,sans-serif;
">

<table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
        background:#050505;
        padding:40px 20px;
    "
>

    <tr>

        <td align="center">

            <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                    max-width:620px;
                    background:#0b0d0d;
                    border:1px solid #1b2420;
                    border-radius:16px;
                    overflow:hidden;
                "
            >

                <tr>

                    <td
                        style="
                            padding:36px 36px 20px 36px;
                        "
                    >

                        <div
                            style="
                                font-size:12px;
                                font-weight:700;
                                letter-spacing:2px;
                                color:#38d996;
                                text-transform:uppercase;
                                margin-bottom:14px;
                            "
                        >
                            HERDSENSE AI
                        </div>

                        <h1
                            style="
                                margin:0;
                                color:#f5f7f5;
                                font-size:30px;
                                line-height:1.2;
                            "
                        >
                            Reset your password
                        </h1>

                    </td>

                </tr>

                <tr>

                    <td
                        style="
                            padding:0 36px 36px 36px;
                        "
                    >

                        <p
                            style="
                                color:#c5ccc8;
                                font-size:16px;
                                line-height:1.7;
                                margin:0 0 20px 0;
                            "
                        >
                            Hello {safe_name},
                        </p>

                        <p
                            style="
                                color:#aeb8b3;
                                font-size:15px;
                                line-height:1.7;
                                margin:0 0 28px 0;
                            "
                        >
                            We received a request to reset
                            your HerdSense AI password.
                        </p>

                        <table
                            cellpadding="0"
                            cellspacing="0"
                            border="0"
                        >

                            <tr>

                                <td>

                                    <a
                                        href="{safe_url}"
                                        style="
                                            display:inline-block;
                                            padding:14px 24px;
                                            background:#38d996;
                                            color:#04110b;
                                            text-decoration:none;
                                            border-radius:9px;
                                            font-weight:700;
                                            font-size:14px;
                                        "
                                    >
                                        Reset Password
                                    </a>

                                </td>

                            </tr>

                        </table>

                        <p
                            style="
                                color:#6f7b75;
                                font-size:13px;
                                line-height:1.6;
                                margin:28px 0 0 0;
                            "
                        >
                            This reset link expires after
                            30 minutes.
                        </p>

                        <p
                            style="
                                color:#56605b;
                                font-size:12px;
                                line-height:1.6;
                                margin:20px 0 0 0;
                            "
                        >
                            If you did not request this password
                            reset, you can safely ignore this email.
                        </p>

                    </td>

                </tr>

            </table>

            <p
                style="
                    max-width:620px;
                    color:#56605b;
                    font-size:12px;
                    line-height:1.6;
                    margin:18px auto 0 auto;
                "
            >
                HerdSense AI — Livestock Intelligence Platform
            </p>

        </td>

    </tr>

</table>

</body>

</html>
"""

    send_email(
        recipient=recipient,
        subject=subject,
        html_body=html_body,
    )