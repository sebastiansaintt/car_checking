import sys
import os

# Agregar el directorio raíz del proyecto al path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.core.database import SessionLocal
from app.models.inspeccion import CatalogoChecklist
from app.models.vehiculo import Vehiculo

def seed_database():
    db = SessionLocal()
    try:
        print("Iniciando sembrado de la base de datos...")

        # 1. Sembrado del Catálogo de Items de Checklist
        checklist_items = [
            ("neumáticos", "Estado general de las llantas, desgaste y presión de aire."),
            ("frenos", "Estado de las pastillas, discos y respuesta de frenado."),
            ("luces", "Luces delanteras, traseras, de freno, de viraje y de emergencia."),
            ("niveles de fluidos", "Aceite de motor, refrigerante, líquido de frenos, dirección hidráulica."),
            ("batería", "Estado de bornes, fijación y carga visual del indicador."),
            ("correas", "Tensión y estado de desgaste de correas de accesorios."),
            ("suspensión", "Estado de amortiguadores, espirales y ausencia de fugas."),
            ("carrocería", "Estado de pintura, abolladuras o golpes externos."),
            ("vidrios/espejos", "Parabrisas, vidrios laterales, luneta y espejos retrovisores."),
            ("cinturones", "Funcionamiento de los anclajes y estado de las cintas de seguridad."),
            ("elementos de seguridad", "Extintor, botiquín, triángulos, gata, rueda de repuesto."),
            ("documentación", "Permiso de circulación, seguro obligatorio, revisión técnica, padrón."),
            ("A/C", "Funcionamiento del aire acondicionado y calefacción."),
            ("sistema eléctrico", "Panel de instrumentos, alzavidrios, bocina y accesorios."),
        ]

        seeded_catalog_count = 0
        for nombre, descripcion in checklist_items:
            # Evitar duplicados
            exists = db.query(CatalogoChecklist).filter_by(nombre=nombre).first()
            if not exists:
                item = CatalogoChecklist(nombre=nombre, descripcion=descripcion, activo=True)
                db.add(item)
                seeded_catalog_count += 1
        
        # 2. Sembrado de los 12 vehículos fijos
        vehiculos = [
            {"marca": "Toyota", "modelo": "Hilux", "año": 2022, "patente": "AB-CD-12", "kilometraje_actual": 45000},
            {"marca": "Toyota", "modelo": "Hilux", "año": 2024, "patente": "EF-GH-34", "kilometraje_actual": 12000},
            {"marca": "Volkswagen", "modelo": "Amarok", "año": 2021, "patente": "JK-LM-56", "kilometraje_actual": 85000},
            {"marca": "Mazda", "modelo": "BT-50", "año": 2020, "patente": "NP-QR-78", "kilometraje_actual": 92000},
            {"marca": "Renault", "modelo": "Oroch", "año": 2022, "patente": "ST-UV-90", "kilometraje_actual": 38000},
            {"marca": "Toyota", "modelo": "Tundra", "año": 2023, "patente": "WX-YZ-12", "kilometraje_actual": 25000},
            {"marca": "Toyota", "modelo": "Tundra", "año": 2025, "patente": "BC-DF-34", "kilometraje_actual": 1500},
            {"marca": "Nissan", "modelo": "Frontier", "año": 2021, "patente": "GH-JK-56", "kilometraje_actual": 67000},
            {"marca": "Nissan", "modelo": "Frontier", "año": 2024, "patente": "LM-NP-78", "kilometraje_actual": 15000},
            {"marca": "Mitsubishi", "modelo": "L200", "año": 2022, "patente": "RS-TV-90", "kilometraje_actual": 54000},
            {"marca": "Nissan", "modelo": "Navara", "año": 2023, "patente": "WY-ZA-12", "kilometraje_actual": 28000},
            {"marca": "Ford", "modelo": "Ranger", "año": 2024, "patente": "BD-FH-34", "kilometraje_actual": 18000},
        ]

        seeded_vehicles_count = 0
        for v in vehiculos:
            # Evitar duplicados
            exists = db.query(Vehiculo).filter_by(patente=v["patente"]).first()
            if not exists:
                vehiculo = Vehiculo(
                    marca=v["marca"],
                    modelo=v["modelo"],
                    año=v["año"],
                    patente=v["patente"],
                    kilometraje_actual=v["kilometraje_actual"],
                    estado="activo"
                )
                db.add(vehiculo)
                seeded_vehicles_count += 1

        db.commit()
        print(f"Sembrado completado: {seeded_catalog_count} ítems de checklist y {seeded_vehicles_count} vehículos agregados.")

    except Exception as e:
        db.rollback()
        print(f"Error durante el sembrado de base de datos: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
