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
    # COMPATIBILITY PROPERTY
    # =========================================================================
    #
    # Existing authentication code uses `user.is_verified`,
    # while the database column is `email_verified`.
    #
    # This property keeps both names working without changing
    # the PostgreSQL schema.
    #

    @property
    def is_verified(self):
        return self.email_verified

    @is_verified.setter
    def is_verified(self, value):
        self.email_verified = value

    # =========================================================================
    # RELATIONSHIPS
    # =========================================================================

    farms = relationship(
        "Farm",
        back_populates="owner",
        cascade="all, delete-orphan",
    )