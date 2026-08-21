import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


# =============================================================================
# HERDSENSE AI — EMAIL SERVICE
# =============================================================================


def send_email(
    recipient: str,
    subject: str,
    html_body: str,
) -> None:

    if not settings.SMTP_USERNAME:
        raise RuntimeError(
            "SMTP_USERNAME is not configured."
        )

    if not settings.SMTP_PASSWORD:
        raise RuntimeError(
            "SMTP_PASSWORD is not configured."
        )

    sender = (
        settings.SMTP_FROM_EMAIL
        or settings.SMTP_USERNAME
    )

    message = MIMEMultipart("alternative")

    message["Subject"] = subject
    message["From"] = sender
    message["To"] = recipient

    message.attach(
        MIMEText(
            html_body,
            "html",
            "utf-8",
        )
    )

    with smtplib.SMTP(
        settings.SMTP_HOST,
        settings.SMTP_PORT,
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
            recipient,
            message.as_string(),
        )


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
    <body style="
        margin:0;
        padding:40px;
        background:#050505;
        color:#f5f5f5;
        font-family:Arial,Helvetica,sans-serif;
    ">

        <div style="
            max-width:560px;
            margin:auto;
            background:#101010;
            border:1px solid #252525;
            padding:40px;
        ">

            <div style="
                font-size:22px;
                font-weight:700;
                margin-bottom:30px;
            ">
                HerdSense AI
            </div>

            <div style="
                color:#28d65c;
                font-size:11px;
                letter-spacing:2px;
                margin-bottom:12px;
            ">
                EMAIL VERIFICATION
            </div>

            <h1 style="
                font-size:30px;
                margin:0 0 16px;
            ">
                Verify your account.
            </h1>

            <p style="
                color:#a1a1a1;
                line-height:1.7;
                font-size:14px;
            ">
                Hello {full_name},
            </p>

            <p style="
                color:#a1a1a1;
                line-height:1.7;
                font-size:14px;
            ">
                Your HerdSense AI account has been created.
                Please verify your email address before
                accessing the platform.
            </p>

            <div style="margin:30px 0;">

                <a
                    href="{verification_url}"
                    style="
                        display:inline-block;
                        padding:14px 22px;
                        background:#ffffff;
                        color:#050505;
                        text-decoration:none;
                        font-weight:700;
                        font-size:13px;
                    "
                >
                    Verify email address
                </a>

            </div>

            <p style="
                color:#686868;
                font-size:11px;
                line-height:1.6;
            ">
                This verification link expires after 24 hours.
            </p>

            <p style="
                color:#686868;
                font-size:11px;
                line-height:1.6;
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

    subject = "Reset your HerdSense AI password"

    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="
        margin:0;
        padding:40px;
        background:#050505;
        color:#f5f5f5;
        font-family:Arial,Helvetica,sans-serif;
    ">

        <div style="
            max-width:560px;
            margin:auto;
            background:#101010;
            border:1px solid #252525;
            padding:40px;
        ">

            <div style="
                font-size:22px;
                font-weight:700;
                margin-bottom:30px;
            ">
                HerdSense AI
            </div>

            <div style="
                color:#ffffff;
                font-size:11px;
                letter-spacing:2px;
                margin-bottom:12px;
            ">
                PASSWORD RESET
            </div>

            <h1 style="
                font-size:30px;
                margin:0 0 16px;
            ">
                Reset your password.
            </h1>

            <p style="
                color:#a1a1a1;
                line-height:1.7;
                font-size:14px;
            ">
                Hello {full_name},
            </p>

            <p style="
                color:#a1a1a1;
                line-height:1.7;
                font-size:14px;
            ">
                We received a request to reset your
                HerdSense AI password.
            </p>

            <div style="margin:30px 0;">

                <a
                    href="{reset_url}"
                    style="
                        display:inline-block;
                        padding:14px 22px;
                        background:#ffffff;
                        color:#050505;
                        text-decoration:none;
                        font-weight:700;
                        font-size:13px;
                    "
                >
                    Reset password
                </a>

            </div>

            <p style="
                color:#686868;
                font-size:11px;
                line-height:1.6;
            ">
                This password-reset link expires after 30 minutes.
            </p>

            <p style="
                color:#686868;
                font-size:11px;
                line-height:1.6;
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