"""v2_subregistros_drop_mantenimiento_drop_evidencias

Revision ID: a1b2c3d4e5f6
Revises: 69bb587a4d7a
Create Date: 2026-08-06 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f7129a028b12'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop tables no longer needed
    op.execute("DROP TABLE IF EXISTS evidencias_fotograficas CASCADE")
    op.execute("DROP TABLE IF EXISTS mantenimientos CASCADE")

    # Add new columns to inspecciones
    op.add_column('inspecciones', sa.Column('inspeccion_primaria_id', sa.UUID(), nullable=True))
    op.add_column('inspecciones', sa.Column('motivo_actualizacion', sa.String(length=100), nullable=True))
    op.add_column('inspecciones', sa.Column('fecha_actualizacion', sa.DateTime(), nullable=True))

    # Foreign key and index
    op.create_foreign_key(
        'fk_inspecciones_inspeccion_primaria_id',
        'inspecciones', 'inspecciones',
        ['inspeccion_primaria_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_index('idx_inspeccion_primaria', 'inspecciones', ['inspeccion_primaria_id'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_inspeccion_primaria', table_name='inspecciones')
    op.drop_constraint('fk_inspecciones_inspeccion_primaria_id', 'inspecciones', type_='foreignkey')
    op.drop_column('inspecciones', 'fecha_actualizacion')
    op.drop_column('inspecciones', 'motivo_actualizacion')
    op.drop_column('inspecciones', 'inspeccion_primaria_id')
