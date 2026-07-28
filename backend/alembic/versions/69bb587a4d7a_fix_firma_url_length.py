"""fix_firma_url_length

Revision ID: 69bb587a4d7a
Revises: e345f8e442e9
Create Date: 2026-07-28 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '69bb587a4d7a'
down_revision: Union[str, Sequence[str], None] = 'e345f8e442e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # firma_url guarda un data URI base64 completo (puede superar 50,000 caracteres),
    # no una URL corta. VARCHAR(512) truncaba el INSERT en producción.
    op.alter_column(
        'inspecciones',
        'firma_url',
        existing_type=sa.String(length=512),
        type_=sa.Text(),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        'inspecciones',
        'firma_url',
        existing_type=sa.Text(),
        type_=sa.String(length=512),
        existing_nullable=False,
    )
