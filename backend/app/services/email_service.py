import json
from html import escape
from urllib import error, request

from app.core.config import settings


# =============================================================================
# HERDSENSE AI — EMAIL SERVICE
# Brevo HTTPS transactional email implementation
# =============================================================================


# =============================================================================
# CONFIGURATION
# =============================================================================

BREVO_TRANSACTIONAL_EMAIL_URL = (
    "https://api.brevo.com/v3/smtp/email"
)


def _validate_brevo_configuration() -> None:
    """
    Validate the minimum configuration required to send email
    through the Brevo transactional email API.
    """

    if not settings.BREVO_API_KEY:
        raise RuntimeError(
            "BREVO_API_KEY is not configured."
        )

    if not settings.BREVO_FROM_EMAIL:
        raise RuntimeError(
            "BREVO_FROM_EMAIL is not configured."
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
# BREVO HTTPS EMAIL SENDER
# =============================================================================


def _send_email(
    recipient: str,
    subject: str,
    html_body: str,
    recipient_name: str | None = None,
) -> None:
    """
    Send a transactional HTML email through the Brevo HTTPS API.

    Uses normal HTTPS traffic on port 443, avoiding SMTP port
    restrictions on the Render Free service.
    """

    _validate_brevo_configuration()

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

    # -------------------------------------------------------------------------
    # BREVO REQUEST PAYLOAD
    # -------------------------------------------------------------------------

    sender = {
        "email": settings.BREVO_FROM_EMAIL,
        "name": "HerdSense AI",
    }

    recipient_data = {
        "email": recipient,
    }

    if recipient_name:
        recipient_data["name"] = recipient_name.strip()

    payload = {
        "sender": sender,
        "to": [
            recipient_data,
        ],
        "subject": subject,
        "htmlContent": html_body,
    }

    payload_bytes = json.dumps(
        payload,
        ensure_ascii=False,
    ).encode("utf-8")

    # -------------------------------------------------------------------------
    # HTTPS REQUEST
    # -------------------------------------------------------------------------

    headers = {
        "accept": "application/json",
        "api-key": settings.BREVO_API_KEY,
        "content-type": "application/json",
    }

    brevo_request = request.Request(
        BREVO_TRANSACTIONAL_EMAIL_URL,
        data=payload_bytes,
        headers=headers,
        method="POST",
    )

    try:
        with request.urlopen(
            brevo_request,
            timeout=20,
        ) as response:

            response_body = response.read().decode(
                "utf-8",
                errors="replace",
            )

            status_code = response.status

        if status_code not in (200, 201):

            print(
                "❌ HerdSense AI Brevo API unexpected "
                f"status: {status_code}"
            )

            raise RuntimeError(
                "Brevo email provider returned an unexpected response."
            )

        message_id = None

        if response_body:
            try:
                response_json = json.loads(response_body)
                message_id = response_json.get("messageId")
            except json.JSONDecodeError:
                pass

        if message_id:
            print(
                "📧 HerdSense AI: "
                f"Email accepted by Brevo for {recipient} "
                f"(messageId={message_id})"
            )
        else:
            print(
                "📧 HerdSense AI: "
                f"Email accepted by Brevo for {recipient}"
            )

    except error.HTTPError as exc:

        response_body = ""

        try:
            response_body = exc.read().decode(
                "utf-8",
                errors="replace",
            )
        except Exception:
            response_body = ""

        print(
            "❌ HerdSense AI Brevo API HTTP error:",
            exc.code,
            response_body,
        )

        if exc.code in (401, 403):

            raise RuntimeError(
                "Brevo email authentication failed. "
                "Check the BREVO_API_KEY configuration."
            ) from exc

        if exc.code == 400:

            raise RuntimeError(
                "Brevo rejected the email request. "
                "Check the sender, recipient, and email payload."
            ) from exc

        raise RuntimeError(
            "Brevo email provider rejected the request."
        ) from exc

    except error.URLError as exc:

        print(
            "❌ HerdSense AI Brevo network error:",
            repr(exc.reason),
        )

        raise RuntimeError(
            "Unable to reach the Brevo email provider."
        ) from exc

    except TimeoutError as exc:

        print(
            "❌ HerdSense AI Brevo timeout:",
            repr(exc),
        )

        raise RuntimeError(
            "Brevo email provider connection timed out."
        ) from exc

    except OSError as exc:

        print(
            "❌ HerdSense AI Brevo network error:",
            repr(exc),
        )

        raise RuntimeError(
            "Unable to reach the Brevo email provider."
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
    recipient_name: str | None = None,
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
        recipient_name=recipient_name,
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
        recipient_name=full_name,
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
        recipient_name=full_name,
    )