from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship

from app.db.database import Base


class User(Base):

    __tablename__ = "users"

    # =========================================================================
    # PRIMARY KEY
    # =========================================================================

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # =========================================================================
    # ACCOUNT INFORMATION
    # =========================================================================

    email = Column(
        String,
        unique=True,
        index=True,
        nullable=False,
    )

    full_name = Column(
        String,
        nullable=False,
    )

    hashed_password = Column(
        String,
        nullable=False,
    )

    role = Column(
        String,
        nullable=False,
        default="farmer",
        server_default="farmer",
    )

    # =========================================================================
    # EMAIL VERIFICATION
    # =========================================================================

    email_verified = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    verification_token = Column(
        String,
        nullable=True,
        index=True,
    )

    verification_token_expires = Column(
        DateTime,
        nullable=True,
    )

    # =========================================================================
    # PASSWORD RESET
    # =========================================================================

    password_reset_token = Column(
        String,
        nullable=True,
        index=True,
    )

    password_reset_expires = Column(
        DateTime,
        nullable=True,
    )

    # =========================================================================
    # WALLET
    # =========================================================================
    #
    # Stores only the PUBLIC blockchain wallet information.
    #
    # IMPORTANT:
    # - Never store a private key here.
    # - No subscription system.
    # - No payment/billing logic.
    # - Wallet connection is simply account ↔ public wallet association.
    #

    wallet_address = Column(
        String,
        unique=True,
        index=True,
        nullable=True,
    )

    wallet_chain = Column(
        String,
        nullable=True,
    )

    wallet_connected_at = Column(
        DateTime,
        nullable=True,
    )

    # =========================================================================
    # COMPATIBILITY PROPERTY
    # =========================================================================
    #
    # Existing authentication/dependency code may use:
    #
    #     user.is_verified
    #
    # while the database column is:
    #
    #     email_verified
    #
    # Keep both working.
    #

    @property
    def is_verified(self):
        return self.email_verified

    @is_verified.setter
    def is_verified(self, value):
        self.email_verified = value

    # =========================================================================
    # RESPONSE COMPATIBILITY PROPERTY
    # =========================================================================
    #
    # UserResponse exposes:
    #
    #     is_email_verified
    #
    # while the database column is:
    #
    #     email_verified
    #
    # This property allows Pydantic's from_attributes=True
    # to read the expected response field.
    #

    @property
    def is_email_verified(self):
        return self.email_verified

    @is_email_verified.setter
    def is_email_verified(self, value):
        self.email_verified = value

    # =========================================================================
    # RELATIONSHIPS
    # =========================================================================

    farms = relationship(
        "Farm",
        back_populates="owner",
        cascade="all, delete-orphan",
    )