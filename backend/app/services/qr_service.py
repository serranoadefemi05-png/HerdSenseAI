from __future__ import annotations

import io

import qrcode


# =============================================================================
# HERDSENSE AI — QR CODE SERVICE
# =============================================================================
#
# Generates QR codes for public digital animal verification records.
#
# The QR code contains a URL, not the animal's private database information.
#
# Example:
#
# https://herdsenseai-frontend.onrender.com/verify/animal/8
#
# Scanning the QR opens the human-readable HerdSense AI verification page.
#
# =============================================================================


def generate_qr_code(
    data: str,
) -> bytes:
    """
    Generate a PNG QR code from the supplied URL or text.
    """

    if not data:
        raise ValueError(
            "QR code data cannot be empty."
        )

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )

    qr.add_data(data)

    qr.make(
        fit=True
    )

    image = qr.make_image()

    buffer = io.BytesIO()

    image.save(
        buffer,
        format="PNG",
    )

    return buffer.getvalue()