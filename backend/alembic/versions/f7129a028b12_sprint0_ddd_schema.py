"""sprint0_ddd_schema

Revision ID: f7129a028b12
Revises: 69bb587a4d7a
Create Date: 2026-07-31 09:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f7129a028b12'
down_revision: Union[str, Sequence[str], None] = '69bb587a4d7a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Crear secuencia para numero_inspeccion
    op.execute("CREATE SEQUENCE IF NOT EXISTS inspeccion_num_seq START WITH 4800 INCREMENT BY 1;")

    # 2. Crear tabla empresas_contratistas
    op.create_table(
        'empresas_contratistas',
        sa.Column('id', sa.UUID(), nullable=False, primary_key=True),
        sa.Column('nombre', sa.String(length=150), nullable=False, unique=True),
        sa.Column('rut', sa.String(length=50), nullable=True),
        sa.Column('contacto', sa.String(length=100), nullable=True),
        sa.Column('activo', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('idx_empresa_nombre', 'empresas_contratistas', ['nombre'])

    # 3. Crear tabla catalogo_sistemas
    op.create_table(
        'catalogo_sistemas',
        sa.Column('id', sa.UUID(), nullable=False, primary_key=True),
        sa.Column('codigo', sa.String(length=10), nullable=False, unique=True),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('orden', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('activo', sa.Boolean(), nullable=False, server_default='true'),
    )
    op.create_index('idx_sistema_codigo', 'catalogo_sistemas', ['codigo'])

    # 4. Modificar vehiculos
    op.add_column('vehiculos', sa.Column('empresa_contratista_id', sa.UUID(), sa.ForeignKey('empresas_contratistas.id', ondelete='SET NULL'), nullable=True))
    op.add_column('vehiculos', sa.Column('tipo_vehiculo', sa.String(length=50), nullable=True))
    op.add_column('vehiculos', sa.Column('numero_interno', sa.String(length=50), nullable=True))
    op.add_column('vehiculos', sa.Column('color', sa.String(length=50), nullable=True))
    op.add_column('vehiculos', sa.Column('equipo_auxiliar', sa.String(length=100), nullable=True))
    op.add_column('vehiculos', sa.Column('area_transitar', sa.String(length=150), nullable=True))

    # 5. Modificar usuarios
    op.add_column('usuarios', sa.Column('cargo', sa.String(length=100), nullable=True))
    op.add_column('usuarios', sa.Column('firma_url', sa.Text(), nullable=True))

    # 6. Modificar catalogo_checklist
    op.add_column('catalogo_checklist', sa.Column('sistema_id', sa.UUID(), sa.ForeignKey('catalogo_sistemas.id', ondelete='SET NULL'), nullable=True))
    op.add_column('catalogo_checklist', sa.Column('codigo_item', sa.String(length=20), nullable=True))

    # 7. Modificar inspecciones
    op.add_column('inspecciones', sa.Column('numero_inspeccion', sa.Integer(), server_default=sa.text("nextval('inspeccion_num_seq')"), nullable=False))
    op.add_column('inspecciones', sa.Column('numero_revision', sa.Integer(), server_default='1', nullable=False))
    op.add_column('inspecciones', sa.Column('inspeccion_previa_id', sa.UUID(), sa.ForeignKey('inspecciones.id', ondelete='SET NULL'), nullable=True))
    op.add_column('inspecciones', sa.Column('empresa_contratista_id', sa.UUID(), sa.ForeignKey('empresas_contratistas.id', ondelete='SET NULL'), nullable=True))
    op.add_column('inspecciones', sa.Column('creado_por_id', sa.UUID(), sa.ForeignKey('usuarios.id', ondelete='RESTRICT'), nullable=True))
    op.add_column('inspecciones', sa.Column('hora_inspeccion', sa.String(length=10), nullable=True))
    op.add_column('inspecciones', sa.Column('area_transitar', sa.String(length=150), nullable=True))
    op.add_column('inspecciones', sa.Column('equipo_auxiliar', sa.String(length=150), nullable=True))
    op.add_column('inspecciones', sa.Column('estado', sa.String(length=30), server_default='en_revision', nullable=False))
    op.add_column('inspecciones', sa.Column('fecha_aprobacion', sa.DateTime(), nullable=True))
    op.add_column('inspecciones', sa.Column('aprobado_por_id', sa.UUID(), sa.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True))
    op.add_column('inspecciones', sa.Column('fecha_proxima_revision', sa.Date(), nullable=True))
    op.add_column('inspecciones', sa.Column('sello_url', sa.Text(), nullable=True))
    op.alter_column('inspecciones', 'firma_url', nullable=True)

    # Migrar coordinador_id a creado_por_id
    op.execute("UPDATE inspecciones SET creado_por_id = coordinador_id WHERE creado_por_id IS NULL;")
    op.alter_column('inspecciones', 'creado_por_id', nullable=False)

    op.create_index('idx_inspeccion_estado', 'inspecciones', ['estado'])
    op.create_index('idx_inspeccion_numero', 'inspecciones', ['numero_inspeccion'])

    # 8. Crear evaluaciones_sistema
    op.create_table(
        'evaluaciones_sistema',
        sa.Column('id', sa.UUID(), nullable=False, primary_key=True),
        sa.Column('inspeccion_id', sa.UUID(), sa.ForeignKey('inspecciones.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sistema_id', sa.UUID(), sa.ForeignKey('catalogo_sistemas.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('estado_sistema', sa.String(length=20), nullable=False),
    )

    # 9. Modificar checklist_items
    op.add_column('checklist_items', sa.Column('comentario', sa.Text(), nullable=True))

    # 10. Crear hallazgos
    op.create_table(
        'hallazgos',
        sa.Column('id', sa.UUID(), nullable=False, primary_key=True),
        sa.Column('inspeccion_id', sa.UUID(), sa.ForeignKey('inspecciones.id', ondelete='CASCADE'), nullable=False),
        sa.Column('item_checklist_id', sa.UUID(), sa.ForeignKey('checklist_items.id', ondelete='SET NULL'), nullable=True),
        sa.Column('descripcion', sa.Text(), nullable=False),
        sa.Column('atendido', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('fecha_atencion', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    )

    # 11. Crear firmas_tecnicos
    op.create_table(
        'firmas_tecnicos',
        sa.Column('id', sa.UUID(), nullable=False, primary_key=True),
        sa.Column('inspeccion_id', sa.UUID(), sa.ForeignKey('inspecciones.id', ondelete='CASCADE'), nullable=False),
        sa.Column('usuario_id', sa.UUID(), sa.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True),
        sa.Column('nombre_adicional', sa.String(length=150), nullable=True),
        sa.Column('firma_url', sa.Text(), nullable=True),
        sa.Column('es_aprobador', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('signed_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    )

def downgrade() -> None:
    op.drop_table('firmas_tecnicos')
    op.drop_table('hallazgos')
    op.drop_column('checklist_items', 'comentario')
    op.drop_table('evaluaciones_sistema')
    op.drop_index('idx_inspeccion_numero', table_name='inspecciones')
    op.drop_index('idx_inspeccion_estado', table_name='inspecciones')
    op.drop_column('inspecciones', 'sello_url')
    op.drop_column('inspecciones', 'fecha_proxima_revision')
    op.drop_column('inspecciones', 'aprobado_por_id')
    op.drop_column('inspecciones', 'fecha_aprobacion')
    op.drop_column('inspecciones', 'estado')
    op.drop_column('inspecciones', 'equipo_auxiliar')
    op.drop_column('inspecciones', 'area_transitar')
    op.drop_column('inspecciones', 'hora_inspeccion')
    op.drop_column('inspecciones', 'creado_por_id')
    op.drop_column('inspecciones', 'empresa_contratista_id')
    op.drop_column('inspecciones', 'inspeccion_previa_id')
    op.drop_column('inspecciones', 'numero_revision')
    op.drop_column('inspecciones', 'numero_inspeccion')
    op.drop_column('catalogo_checklist', 'codigo_item')
    op.drop_column('catalogo_checklist', 'sistema_id')
    op.drop_column('usuarios', 'firma_url')
    op.drop_column('usuarios', 'cargo')
    op.drop_column('vehiculos', 'area_transitar')
    op.drop_column('vehiculos', 'equipo_auxiliar')
    op.drop_column('vehiculos', 'color')
    op.drop_column('vehiculos', 'numero_interno')
    op.drop_column('vehiculos', 'tipo_vehiculo')
    op.drop_column('vehiculos', 'empresa_contratista_id')
    op.drop_table('catalogo_sistemas')
    op.drop_table('empresas_contratistas')
    op.execute("DROP SEQUENCE IF EXISTS inspeccion_num_seq;")
