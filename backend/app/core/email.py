"""
HerdSense AI — Email Compatibility Module

The active email implementation lives in:

    app.services.email_service

This module is retained only for backwards compatibility.

It does not contain an SMTP implementation.
"""

from app.services.email_service import (
    send_email,
    send_verification_email,
    send_password_reset_email,
)


__all__ = [
    "send_email",
    "send_verification_email",
    "send_password_reset_email",
]