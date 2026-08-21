import smtplib
from email.message import EmailMessage

from app.core.config import settings


# =============================================================================
# HERDSENSE AI — EMAIL SERVICE
# =============================================================================


def send_email(
    recipient: str,
    subject: str,
    html_content: str,
) -> None:
    """
    Send an HTML email through the configured SMTP server.
    """

    smtp_username = str(
        settings.SMTP_USERNAME or ""
    ).strip()

    smtp_password = str(
        settings.SMTP_PASSWORD or ""
    ).strip()

    smtp_from_email = str(
        settings.SMTP_FROM_EMAIL or ""
    ).strip()

    smtp_host = str(
        settings.SMTP_HOST or "smtp.gmail.com"
    ).strip()

    smtp_port = int(
        settings.SMTP_PORT or 587
    )

    if not smtp_username:
        raise RuntimeError(
            "SMTP_USERNAME is not configured."
        )

    if not smtp_password:
        raise RuntimeError(
            "SMTP_PASSWORD is not configured."
        )

    if not smtp_from_email:
        smtp_from_email = smtp_username

    message = EmailMessage()

    message["Subject"] = subject
    message["From"] = smtp_from_email
    message["To"] = recipient

    message.set_content(
        "This email requires an HTML-compatible email client."
    )

    message.add_alternative(
        html_content,
        subtype="html",
    )

    try:

        with smtplib.SMTP(
            smtp_host,
            smtp_port,
            timeout=30,
        ) as server:

            server.ehlo()

            server.starttls()

            server.ehlo()

            server.login(
                smtp_username,
                smtp_password,
            )

            server.send_message(
                message
            )

    except Exception as exc:

        print(
            "❌ HerdSense AI email error:",
            repr(exc),
        )

        raise RuntimeError(
            "Unable to send email."
        ) from exc


# =============================================================================
# VERIFICATION EMAIL
# =============================================================================


def send_verification_email(
    recipient: str,
    full_name: str,
    verification_url: str,
) -> None:

    subject = "Verify your HerdSense AI account"

    html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Verify your HerdSense AI account</title>
</head>

<body style="
    margin:0;
    padding:0;
    background:#050505;
    font-family:Arial,Helvetica,sans-serif;
    color:#f5f5f5;
">

<div style="
    max-width:600px;
    margin:40px auto;
    padding:40px;
    background:#101010;
    border:1px solid #252525;
    border-radius:16px;
">

    <div style="
        font-size:22px;
        font-weight:700;
        margin-bottom:8px;
    ">
        HerdSense AI
    </div>

    <div style="
        color:#777;
        font-size:12px;
        margin-bottom:35px;
    ">
        The intelligence layer for livestock
    </div>

    <h1 style="
        font-size:28px;
        margin-bottom:15px;
    ">
        Verify your account
    </h1>

    <p style="
        color:#aaa;
        line-height:1.7;
    ">
        Hello {full_name},
    </p>

    <p style="
        color:#aaa;
        line-height:1.7;
    ">
        Thank you for creating your HerdSense AI account.
        Please verify your email address before signing in.
    </p>

    <div style="margin:35px 0;">

        <a href="{verification_url}"
           style="
                display:inline-block;
                padding:14px 24px;
                background:#ffffff;
                color:#050505;
                text-decoration:none;
                border-radius:8px;
                font-weight:700;
                font-size:14px;
           ">
            Verify my email
        </a>

    </div>

    <p style="
        color:#666;
        font-size:12px;
        line-height:1.6;
    ">
        This verification link expires after 24 hours.
    </p>

    <p style="
        color:#555;
        font-size:11px;
        line-height:1.6;
        word-break:break-all;
    ">
        If the button does not work, copy and paste this link:
        {verification_url}
    </p>

</div>

</body>
</html>
"""

    send_email(
        recipient=recipient,
        subject=subject,
        html_content=html,
    )


# =============================================================================
# PASSWORD RESET EMAIL
# =============================================================================


def send_password_reset_email(
    recipient: str,
    full_name: str,
    reset_url: str,
) -> None:

    subject = "Reset your HerdSense AI password"

    html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Reset your HerdSense AI password</title>
</head>

<body style="
    margin:0;
    padding:0;
    background:#050505;
    font-family:Arial,Helvetica,sans-serif;
    color:#f5f5f5;
">

<div style="
    max-width:600px;
    margin:40px auto;
    padding:40px;
    background:#101010;
    border:1px solid #252525;
    border-radius:16px;
">

    <div style="
        font-size:22px;
        font-weight:700;
        margin-bottom:8px;
    ">
        HerdSense AI
    </div>

    <div style="
        color:#777;
        font-size:12px;
        margin-bottom:35px;
    ">
        The intelligence layer for livestock
    </div>

    <h1 style="
        font-size:28px;
        margin-bottom:15px;
    ">
        Reset your password
    </h1>

    <p style="
        color:#aaa;
        line-height:1.7;
    ">
        Hello {full_name},
    </p>

    <p style="
        color:#aaa;
        line-height:1.7;
    ">
        We received a request to reset the password
        associated with your HerdSense AI account.
    </p>

    <div style="margin:35px 0;">

        <a href="{reset_url}"
           style="
                display:inline-block;
                padding:14px 24px;
                background:#ffffff;
                color:#050505;
                text-decoration:none;
                border-radius:8px;
                font-weight:700;
                font-size:14px;
           ">
            Reset password
        </a>

    </div>

    <p style="
        color:#666;
        font-size:12px;
        line-height:1.6;
    ">
        This password reset link expires after 30 minutes.
    </p>

    <p style="
        color:#555;
        font-size:11px;
        line-height:1.6;
        word-break:break-all;
    ">
        If the button does not work, copy and paste this link:
        {reset_url}
    </p>

    <p style="
        color:#666;
        font-size:12px;
        line-height:1.6;
    ">
        If you did not request a password reset, you can safely
        ignore this email.
    </p>

</div>

</body>
</html>
"""

    send_email(
        recipient=recipient,
        subject=subject,
        html_content=html,
    )