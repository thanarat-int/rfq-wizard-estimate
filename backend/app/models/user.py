from sqlalchemy import Column, Integer, String, Boolean
from app.models.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(200), nullable=False)
    role = Column(String(50), nullable=False, default="sales")  # admin, sales, customer
    company = Column(String(200))
    phone = Column(String(50))
    active = Column(Boolean, default=True)
