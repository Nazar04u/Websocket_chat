from sqlalchemy.orm import Session

from app.models import GroupChat


def check_if_admin(admin_id: int, group_id: int, db: Session):
    group = db.query(GroupChat).get(group_id)

    return admin_id == group.admin_id
