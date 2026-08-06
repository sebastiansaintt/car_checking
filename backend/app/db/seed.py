import sys
import os

# Agregar el directorio raíz del proyecto al path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.core.database import SessionLocal
from app.models.empresa_contratista import EmpresaContratista
from app.models.catalogo_sistema import CatalogoSistema
from app.models.inspeccion import CatalogoChecklist
from app.models.usuario import Usuario
from app.core.security import hash_password

def seed_database():
    db = SessionLocal()
    try:
        print("Iniciando depuración completa y sembrado con credenciales oficiales...")

        # 0. Eliminar todas las filas de todas las tablas en orden de dependencias FK
        db.execute(sys.modules['sqlalchemy'].text("TRUNCATE audit_logs, notificaciones, firmas_tecnicos, hallazgos, checklist_items, evaluaciones_sistema, inspecciones, vehiculos, empresas_contratistas, usuarios, catalogo_checklist, catalogo_sistemas CASCADE;"))
        db.commit()
        print("Todas las tablas han sido vaciadas exitosamente.")

        # 1. Sembrado de Empresas Contratistas
        empresas = [
            {"nombre": "Epromecánica S.A.S.", "rut": "900.123.456-1", "contacto": "contacto@epromecanica.com"},
            {"nombre": "Servicios Cerrejón Ltda.", "rut": "800.987.654-2", "contacto": "operaciones@cerrejon.com"},
            {"nombre": "Contratistas Mineros del Norte", "rut": "901.555.777-3", "contacto": "flota@minerosnorte.com"}
        ]
        for emp in empresas:
            emp_obj = EmpresaContratista(nombre=emp["nombre"], rut=emp["rut"], contacto=emp["contacto"], activo=True)
            db.add(emp_obj)

        # 2. Sembrado de Usuarios (4 Credenciales Oficiales Únicas)
        usuarios = [
            {
                "nombre": "Técnico Inspector",
                "email": "inspector@carchecking.com",
                "password": "QrmKv3KPffN6",
                "rol": "tecnico_inspector",
                "cargo": "Técnico Inspector de Campo"
            },
            {
                "nombre": "Ingeniero",
                "email": "ingeniero@carchecking.com",
                "password": "Js08$LhIDGfq",
                "rol": "ingeniero",
                "cargo": "Ingeniero de Calidad e Inspección"
            },
            {
                "nombre": "Programador",
                "email": "programador@carchecking.com",
                "password": "mtVI7@JT#LuE",
                "rol": "programador",
                "cargo": "Programador de Operaciones"
            },
            {
                "nombre": "Administrador Sointer",
                "email": "admin@carchecking.com",
                "password": "yhFS8RjHvruP",
                "rol": "administrador",
                "cargo": "Administrador del Sistema"
            }
        ]

        for u in usuarios:
            usuario = Usuario(
                nombre=u["nombre"],
                email=u["email"],
                password_hash=hash_password(u["password"]),
                rol=u["rol"],
                cargo=u["cargo"],
                activo=True
            )
            db.add(usuario)

        # 3. Sembrado de los 9 Sistemas de la Planilla FO-M4-P13-96
        sistemas_data = [
            ("1", "SISTEMA DE DIRECCIÓN", 1),
            ("2", "SISTEMA DE POTENCIA (MOTOR)", 2),
            ("3", "SISTEMA DE TRANSMISIÓN Y DIFERENCIALES", 3),
            ("4", "SISTEMA CHASIS - CABINA / SEGURIDAD PASIVA-ACTIVA", 4),
            ("5", "SISTEMA ELÉCTRICO / AIRE ACONDICIONADO", 5),
            ("6", "SISTEMA DE FRENOS", 6),
            ("7", "SISTEMA DE SUSPENSIÓN", 7),
            ("8", "EQUIPO AUXILIAR", 8),
            ("9", "RINES Y LLANTAS", 9),
        ]

        sistema_obj_map = {}
        for codigo, nombre, orden in sistemas_data:
            sys_obj = CatalogoSistema(codigo=codigo, nombre=nombre, orden=orden, activo=True)
            db.add(sys_obj)
            db.flush()
            sistema_obj_map[codigo] = sys_obj

        # 4. Sembrado del Catálogo de Items por Sistema
        checklist_items = [
            # Sistema 1: Dirección
            ("1", "1.1", "NIVEL DE FLUIDO (Dentro de los límites)", "Nivel de fluido de dirección hidráulica."),
            ("1", "1.2", "MANGUERAS Y LÍNEAS (Sin partiduras, sin fugas)", "Mangueras y tubos de dirección."),
            ("1", "1.3", "COLUMNA DE DIRECCIÓN (Sin juego, volante bien posicionado)", "Estado de la columna y ajuste."),
            ("1", "1.4", "TERMINALES / RÓTULAS (Sin desajuste, tuercas con pines hendidos)", "Estado de terminales y rótulas."),
            ("1", "1.5", "CAJA / BOMBA DE DIRECCIÓN (Sin fuga, ruidos)", "Caja cremallera y bomba de dirección."),
            ("1", "1.6", "SPLINDER (Sin juego en pines, puntos de engrase)", "Pines de dirección."),
            ("1", "1.7", "RODAMIENTOS PUNTA DE EJE (Sin juego ni puntos rígidos)", "Rodamientos de punta de eje."),
            
            # Sistema 2: Motor
            ("2", "2.1", "CORREAS (Alineadas, tensionadas y sin desgaste)", "Correas de accesorios/distribución."),
            ("2", "2.2", "MANGUERAS Y CONEXIONES (Sin fugas)", "Mangueras de radiador y tuberías."),
            ("2", "2.3", "NIVELES (Refrigerante y aceite)", "Niveles principales del motor."),
            ("2", "2.4", "EXOSTO (Sistema de escape)", "Estado del tubo de escape y silenciador."),
            ("2", "2.5", "MOTOR (Combustión pareja)", "Estado general y ruidos de motor."),
            ("2", "2.6", "FRENO DE AHOGO / FRENO MOTOR (Operativos)", "Operatividad freno de ahogo."),
            ("2", "2.7", "NÚMERO MOTOR", "Legibilidad número de motor."),

            # Sistema 3: Transmisión
            ("3", "3.1", "EMBRAGUE (Ajustado, calibrado, altura pedal correcta)", "Estado y regulación de embrague."),
            ("3", "3.2", "NIVELES DE FLUIDOS", "Niveles de transmisión y diferenciales."),
            ("3", "3.3", "RODAMIENTOS CENTRALES (Alineados y lubricados)", "Soportes de cardán."),
            ("3", "3.4", "EJE CARDÁN (Ajustado, sin juego excesivo en yequi, crucetas)", "Estado de crucetas y cardanes."),
            ("3", "3.5", "TRANSMISIÓN (Ajustada, sin fugas)", "Caja de cambios."),
            ("3", "3.6", "DIFERENCIAL (Sin fuga, frontal/lateral, tapón)", "Diferencial o telerón."),
            ("3", "3.7", "PEDAL DE EMBRAGUE (Con caucho antideslizante)", "Pedalera de embrague."),

            # Sistema 4: Chasis / Cabina / Seguridad
            ("4", "4.1", "CINTURÓN DE SEGURIDAD (Tres puntos de anclaje)", "Estado y retención de cinturones."),
            ("4", "4.2", "AIRBAG (Frontales y laterales)", "Indicador y módulos de airbag."),
            ("4", "4.3", "SILLAS Y TAPIZADOS", "Estado de asientos y estructuras."),
            ("4", "4.4", "VIDRIOS LATERALES / PANORÁMICOS Y ESPEJOS", "Visibilidad y ausencia de fisuras."),
            ("4", "4.5", "ANTENA BUGGY WHIP (4.20m altura)", "Antena de seguridad para mina."),
            ("4", "4.6", "EXTINTOR MULTIPROPÓSITO", "Manómetro, fecha vencimiento y fijación."),
            ("4", "4.7", "CARROCERÍA (Golpes, corrosión, cerraduras)", "Estado estético y funcional exterior."),
            ("4", "4.8", "ROP - BARRA ANTIVOLCO", "Barra antivolco interna/externa."),
            ("4", "4.9", "CONTROL DE ESTABILIDAD", "Sistemas electrónicos de asistencia."),
            ("4", "4.10", "LLANTAS Y RINES", "Estado general de ruedas."),
            ("4", "4.11", "FRENOS ABS", "Indicador y estado sistema ABS."),
            ("4", "4.12", "SISTEMA CAS, OAS Y RADIO COMUNICACIÓN", "Equipos de radio y aviso mina."),

            # Sistema 5: Eléctrico / AC
            ("5", "5.1", "CABLES Y CONEXIONES (Bien enrutados)", "Cableado motor y cabina."),
            ("5", "5.2", "AIRE ACONDICIONADO (Trabajando a confort)", "Enfriamiento y ventilación."),
            ("5", "5.3", "PITO (Funcionando correctamente)", "Bocina sonora."),
            ("5", "5.4", "ALARMAS E INSTRUMENTOS DE CONTROL", "Velocímetro, tacómetro, testigos."),
            ("5", "5.5", "BATERÍA (Voltaje correcto, sin bornes sulfatados)", "Carga y sujeción de batería."),
            ("5", "5.6", "MOTOR DE ARRANQUE (Funcionamiento)", "Encendido de motor."),
            ("5", "5.7", "LUCES DE CAMPO Y BALIZA (Operativas)", "Licuadora y baliza minera."),
            ("5", "5.8", "LUCES DELANTERAS, TRASERAS Y REVER", "Luces de servicio."),
            ("5", "5.9", "LUCES DIRECCIONALES, PARQUEO Y CAPACETES", "Luces direccionales."),
            ("5", "5.10", "LIMPIA PARABRISAS (Plumillas en buen estado)", "Limpiaparabrisas y agua."),

            # Sistema 6: Frenos
            ("6", "6.1", "FRENO DE PARQUEO / EMERGENCIA", "Guayas y mecanismo de parqueo."),
            ("6", "6.2", "MANGUERAS Y TUBERÍAS (Sin fugas)", "Líneas de freno."),
            ("6", "6.3", "NIVEL DEL LÍQUIDO / PRESIÓN DE AIRE", "Depósito y presión de frenado."),
            ("6", "6.4", "FRENOS (Calibrados)", "Respuesta de frenado."),
            ("6", "6.5", "INSTRUMENTOS DE CONTROL (Manómetros)", "Relojes de presión."),
            ("6", "6.6", "PEDAL DE FRENO (Con caucho antideslizante)", "Estado del pedal de freno."),
            ("6", "6.7", "ROTOCAMARAS / RACHES", "Cámaras de freno o pulmones."),
            ("6", "6.8", "BANDAS / MORDAZAS (Sin grietas, desgastadas)", "Pastillas y zapatas."),
            ("6", "6.9", "TANQUES, VÁLVULAS DE DRENAJE Y GUAYAS", "Tanques de aire/líquido."),

            # Sistema 7: Suspensión
            ("7", "7.1", "MUELLES (Pasadores y bujes en buen estado)", "Hojas de muelle y balancines."),
            ("7", "7.2", "AMORTIGUADORES / RESORTES (Sin fugas, abolladuras)", "Amortiguadores delanteros/traseros."),
            ("7", "7.3", "BARRAS (Sin deformaciones, bujes y pasadores)", "Barras estabilizadoras."),
            ("7", "7.4", "BRAZOS DE SUSPENSIÓN (Sin grietas, rótulas)", "Tijeras y brazos de control."),
            ("7", "7.5", "FUELLES (Sin fugas, platos sin corrosión)", "Fuelles neumático/cauchos."),

            # Sistema 8: Equipo Auxiliar
            ("8", "8.1", "VOLQUETAS (PTO, Bombas, Cilindro volcador)", "Volco y bomba hidráulica."),
            ("8", "8.2", "TANQUEROS / BOMBEROS", "Carrete, mangueras y pistolas."),
            ("8", "8.3", "LUBRICADOR", "Bombas y contadores de grasa/aceite."),
            ("8", "8.4", "CANASTAS / ELEVADORES", "Boom, cilindros y controles elevación."),
            ("8", "8.5", "GRÚAS (Estructura, gancho, guayas)", "Pluma y aseguramiento."),
            ("8", "8.6", "CAMABAJAS (Quinta rueda, estructura trailer)", "Quinta rueda y tráiler."),
            ("8", "8.7", "OTROS EQUIPOS AUXILIARES", "Otros accesorios contratista."),

            # Sistema 9: Rines y Llantas
            ("9", "9.1", "PROFUNDIDAD DE LABRADO (mm)", "Milímetros de labrado llantas delanteras/traseras."),
            ("9", "9.2", "ESPÁRRAGOS Y TUERCAS (Estado de torque)", "Estado y completitud de tuercas."),
            ("9", "9.3", "INDICADORES DE TUERCA (Torque Check)", "Indicadores visuales amarillo/verde."),
            ("9", "9.4", "LLANTA DE REPUESTO (Operativa y medida)", "Llanta de auxilio."),
        ]

        for sys_code, item_code, nombre, descripcion in checklist_items:
            sys_obj = sistema_obj_map.get(sys_code)
            item = CatalogoChecklist(
                sistema_id=sys_obj.id if sys_obj else None,
                codigo_item=item_code,
                nombre=nombre,
                descripcion=descripcion,
                activo=True
            )
            db.add(item)

        db.commit()
        print("Sembrado completado con éxito con las credenciales oficiales finales.")

    except Exception as e:
        db.rollback()
        print(f"Error durante el sembrado de base de datos: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
