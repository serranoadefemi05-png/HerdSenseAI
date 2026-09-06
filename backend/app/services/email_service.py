from html import escape

import resend

from app.core.config import settings


# =============================================================================
# HERDSENSE AI — EMAIL SERVICE
# Resend transactional email implementation
# =============================================================================


def _validate_resend_configuration() -> None:
    """
    Validate the minimum configuration required to send email through Resend.
    """

    if not settings.RESEND_API_KEY:
        raise RuntimeError(
            "RESEND_API_KEY is not configured."
        )

    if not settings.RESEND_FROM_EMAIL:
        raise RuntimeError(
            "RESEND_FROM_EMAIL is not configured."
        )


def _validate_recipient(recipient: str) -> str:
    """
    Validate and normalize the recipient address.
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


def _send_email(
    recipient: str,
    subject: str,
    html_body: str,
) -> None:
    """
    Send a transactional email through Resend.
    """

    _validate_resend_configuration()

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

    resend.api_key = settings.RESEND_API_KEY

    try:

        response = resend.Emails.send(
            {
                "from": settings.RESEND_FROM_EMAIL,
                "to": [recipient],
                "subject": subject,
                "html": html_body,
            }
        )

        if not response:
            raise RuntimeError(
                "Resend returned an empty response."
            )

    except Exception as exc:

        print(
            "❌ HerdSense AI Resend email error:",
            repr(exc),
        )

        raise RuntimeError(
            "Unable to send email through Resend."
        ) from exc


def send_email(
    recipient: str,
    subject: str,
    html_body: str,
) -> None:
    """
    Public email service interface.

    Existing authentication code can continue calling
    send_email() without needing to know which provider
    is being used.
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

    safe_name = escape(full_name)
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
    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">
    <title>Verify your HerdSense AI account</title>
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
    style="background:#050505;padding:40px 20px;"
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
                    <td style="padding:36px 36px 20px 36px;">

                        <div style="
                            font-size:12px;
                            font-weight:700;
                            letter-spacing:2px;
                            color:#38d996;
                            text-transform:uppercase;
                            margin-bottom:14px;
                        ">
                            HERDSENSE AI
                        </div>

                        <h1 style="
                            margin:0;
                            color:#f5f7f5;
                            font-size:30px;
                            line-height:1.2;
                        ">
                            Verify your account
                        </h1>

                    </td>
                </tr>

                <tr>
                    <td style="
                        padding:0 36px 36px 36px;
                    ">

                        <p style="
                            color:#c5ccc8;
                            font-size:16px;
                            line-height:1.7;
                            margin:0 0 20px 0;
                        ">
                            Hello {safe_name},
                        </p>

                        <p style="
                            color:#aeb8b3;
                            font-size:15px;
                            line-height:1.7;
                            margin:0 0 28px 0;
                        ">
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

                        <p style="
                            color:#6f7b75;
                            font-size:13px;
                            line-height:1.6;
                            margin:28px 0 0 0;
                        ">
                            This verification link expires
                            after 24 hours.
                        </p>

                    </td>
                </tr>

            </table>

            <p style="
                max-width:620px;
                color:#56605b;
                font-size:12px;
                line-height:1.6;
                margin:18px auto 0 auto;
            ">
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

    safe_name = escape(full_name)
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
    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">
    <title>Reset your HerdSense AI password</title>
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
    style="background:#050505;padding:40px 20px;"
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
                    <td style="padding:36px 36px 20px 36px;">

                        <div style="
                            font-size:12px;
                            font-weight:700;
                            letter-spacing:2px;
                            color:#38d996;
                            text-transform:uppercase;
                            margin-bottom:14px;
                        ">
                            HERDSENSE AI
                        </div>

                        <h1 style="
                            margin:0;
                            color:#f5f7f5;
                            font-size:30px;
                            line-height:1.2;
                        ">
                            Reset your password
                        </h1>

                    </td>
                </tr>

                <tr>
                    <td style="
                        padding:0 36px 36px 36px;
                    ">

                        <p style="
                            color:#c5ccc8;
                            font-size:16px;
                            line-height:1.7;
                            margin:0 0 20px 0;
                        ">
                            Hello {safe_name},
                        </p>

                        <p style="
                            color:#aeb8b3;
                            font-size:15px;
                            line-height:1.7;
                            margin:0 0 28px 0;
                        ">
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

                        <p style="
                            color:#6f7b75;
                            font-size:13px;
                            line-height:1.6;
                            margin:28px 0 0 0;
                        ">
                            This reset link expires after 30 minutes.
                        </p>

                        <p style="
                            color:#56605b;
                            font-size:12px;
                            line-height:1.6;
                            margin:20px 0 0 0;
                        ">
                            If you did not request this password
                            reset, you can safely ignore this email.
                        </p>

                    </td>
                </tr>

            </table>

            <p style="
                max-width:620px;
                color:#56605b;
                font-size:12px;
                line-height:1.6;
                margin:18px auto 0 auto;
            ">
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