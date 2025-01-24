from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Table
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

# Association table for many-to-many relationship between users and group chats
group_user_association = Table(
    "group_users",
    Base.metadata,
    Column("group_id", Integer, ForeignKey("group_chats.id"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True)
)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    groups = relationship("GroupChat", secondary=group_user_association, back_populates="users")


class PrivateChat(Base):
    __tablename__ = "private_chats"
    id = Column(Integer, primary_key=True, index=True)
    user1_id = Column(Integer, ForeignKey("users.id"))
    user2_id = Column(Integer, ForeignKey("users.id"))
    messages = relationship("PrivateMessage", back_populates="chat", cascade="all, delete-orphan")


class PrivateMessage(Base):
    __tablename__ = "private_messages"
    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("private_chats.id"))
    sender_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    chat = relationship("PrivateChat", back_populates="messages")


class GroupChat(Base):
    __tablename__ = "group_chats"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"))  # Optionally track the group admin
    users = relationship("User", secondary=group_user_association, back_populates="groups")
    messages = relationship("GroupMessage", back_populates="group", cascade="all, delete-orphan")


class GroupMessage(Base):
    __tablename__ = "group_messages"
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("group_chats.id"))
    sender_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    group = relationship("GroupChat", back_populates="messages")