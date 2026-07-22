"""add_mantenimientos_and_notificaciones

Revision ID: e345f8e442e9
Revises: d213f8e331d8
Create Date: 2026-07-21 19:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e345f8e442e9'
down_revision: Union[str, Sequence[str], None] = 'd213f8e331d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tabla mantenimientos
    op.create_table(
        'mantenimientos',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('vehiculo_id', sa.Uuid(), nullable=False),
        sa.Column('coordinador_id', sa.Uuid(), nullable=False),
        sa.Column('inspeccion_origen_id', sa.Uuid(), nullable=True),
        sa.Column('tipo', sa.String(length=20), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=False),
        sa.Column('fecha_limite', sa.Date(), nullable=False),
        sa.Column('fecha_completado', sa.DateTime(), nullable=True),
        sa.Column('kilometraje_al_crear', sa.Integer(), nullable=False),
        sa.Column('kilometraje_al_completar', sa.Integer(), nullable=True),
        sa.Column('estado', sa.String(length=20), server_default='pendiente', nullable=False),
        sa.Column('observaciones', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['coordinador_id'], ['usuarios.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['inspeccion_origen_id'], ['inspecciones.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['vehiculo_id'], ['vehiculos.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_mant_vehiculo_estado', 'mantenimientos', ['vehiculo_id', 'estado'], unique=False)

    # Tabla notificaciones
    op.create_table(
        'notificaciones',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('usuario_id', sa.Uuid(), nullable=False),
        sa.Column('tipo', sa.String(length=50), nullable=False),
        sa.Column('titulo', sa.String(length=200), nullable=False),
        sa.Column('mensaje', sa.Text(), nullable=False),
        sa.Column('referencia_id', sa.String(length=255), nullable=True),
        sa.Column('referencia_tipo', sa.String(length=50), nullable=True),
        sa.Column('leida', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_notif_usuario_leida', 'notificaciones', ['usuario_id', 'leida', 'created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_notif_usuario_leida', table_name='notificaciones')
    op.drop_table('notificaciones')
    op.drop_index('idx_mant_vehiculo_estado', table_name='mantenimientos')
    op.drop_table('mantenimientos')
