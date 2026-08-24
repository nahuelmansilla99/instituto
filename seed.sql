-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum Types
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('STUDENT', 'ADMIN', 'SYSADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE progress_status_enum AS ENUM ('LOCKED', 'AVAILABLE', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role_enum DEFAULT 'STUDENT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 2. Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    thumbnail_url VARCHAR(500),
    meet_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 3. Lessons Table
CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    order_number INTEGER NOT NULL,
    meet_url VARCHAR(500),
    presentation_url VARCHAR(500),
    presentation_filename VARCHAR(255),
    available_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 4. Quiz Questions Table
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. User Progress Table
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    status progress_status_enum DEFAULT 'LOCKED',
    score NUMERIC(5,2),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    "quizAnswers" JSONB,
    attempts_count INTEGER DEFAULT 0,
    UNIQUE(user_id, lesson_id)
);

-- SEED DATA
-- Default Admin User (Password: admin123)
-- Default Student User (Password: student123)
INSERT INTO users (id, email, password_hash, name, role)
VALUES 
('a0000000-0000-0000-0000-000000000001', 'admin@instituto.com', '$2b$10$dC6R1DWBw8pWzJzoQ4KaqegY0Ucof7ixt69cZoGxF.HHUtfXNVPLK', 'Profesor Administrador', 'ADMIN'),
('a0000000-0000-0000-0000-000000000002', 'alumno@instituto.com', '$2b$10$sptF5WY5.j/oBvocDMv6Ve9x0q8bX6NKou8Z2bYQTDl2j4ZyVbWby', 'Juan Pérez (Alumno)', 'STUDENT'),
('a0000000-0000-0000-0000-000000000003', 'sysadmin@instituto.com', '$2b$10$dC6R1DWBw8pWzJzoQ4KaqegY0Ucof7ixt69cZoGxF.HHUtfXNVPLK', 'Super Administrador', 'SYSADMIN')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, role = EXCLUDED.role;

-- Course 1: Full-Stack Web Development con NestJS y Angular
INSERT INTO courses (id, title, description, thumbnail_url, meet_url)
VALUES (
    'c1000000-0000-0000-0000-000000000001',
    'Masterclass: Desarrollo Full-Stack con NestJS y Angular',
    'Aprende a construir aplicaciones escalables desde cero utilizando TypeScript en el backend y frontend con arquitectura modular, base de datos relacional y autenticación JWT.',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=60',
    'https://meet.google.com/abc-defg-hij'
) ON CONFLICT (id) DO NOTHING;

-- Course 2: Arquitectura de Software y Patrones de Diseño
INSERT INTO courses (id, title, description, thumbnail_url)
VALUES (
    'c2000000-0000-0000-0000-000000000002',
    'Arquitectura de Software y Patrones de Diseño Modernos',
    'Domina los principios SOLID, Clean Architecture, Domain Driven Design (DDD) y patrones arquitectónicos para crear sistemas robustos y testeables.',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=60'
) ON CONFLICT (id) DO NOTHING;

-- Lessons for Course 1
-- Lesson 1
INSERT INTO lessons (id, course_id, title, content, order_number)
VALUES (
    'b1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    '1. Introducción a la Arquitectura Modular de NestJS',
    '<h2>Bienvenido al curso</h2><p>En esta lección inaugural exploraremos los conceptos esenciales de <strong>NestJS</strong>, el framework de Node.js progresivo construido sobre Express/Fastify y potenciado por TypeScript.</p><h3>Puntos clave:</h3><ul><li><strong>Módulos:</strong> Organización estructural mediante el decorador <code>@Module()</code>.</li><li><strong>Controladores:</strong> Encargados de recibir peticiones HTTP con <code>@Controller()</code>.</li><li><strong>Proveedores / Servicios:</strong> Lógica de negocio inyectable con <code>@Injectable()</code>.</li><li><strong>Inyección de Dependencias:</strong> El contenedor IoC gestiona el ciclo de vida.</li></ul><div class="video-container" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;margin:24px 0;"><iframe src="https://www.youtube.com/embed/0M8AYU_hPas" title="NestJS Introduction" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div>',
    1
) ON CONFLICT (id) DO NOTHING;

-- Lesson 2
INSERT INTO lessons (id, course_id, title, content, order_number)
VALUES (
    'b2000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000001',
    '2. Persistencia de Datos con TypeORM y PostgreSQL',
    '<h2>Persistencia Relacional</h2><p>En esta clase conectamos nuestra API a <strong>PostgreSQL</strong> mediante <strong>TypeORM</strong>, un potente Object-Relational Mapper para TypeScript.</p><h3>Contenido:</h3><ul><li>Definición de entidades con <code>@Entity()</code> y columnas con <code>@Column()</code>.</li><li>Relaciones <code>@ManyToOne()</code>, <code>@OneToMany()</code> y <code>@OneToOne()</code>.</li><li>Uso de Repositorios (<code>Repository&lt;T&gt;</code>) para consultas CRUD eficientes.</li><li>Transacciones y migraciones en entornos de producción.</li></ul><div class="code-block" style="background:#1e293b;color:#f8fafc;padding:16px;border-radius:8px;font-family:monospace;margin:16px 0;"><code>@Entity()<br>export class User {<br>&nbsp;&nbsp;@PrimaryGeneratedColumn(''uuid'')<br>&nbsp;&nbsp;id: string;<br><br>&nbsp;&nbsp;@Column({ unique: true })<br>&nbsp;&nbsp;email: string;<br>}</code></div>',
    2
) ON CONFLICT (id) DO NOTHING;

-- Lesson 3
INSERT INTO lessons (id, course_id, title, content, order_number)
VALUES (
    'b3000000-0000-0000-0000-000000000003',
    'c1000000-0000-0000-0000-000000000001',
    '3. Frontend Reactivo con Angular Standalone Components',
    '<h2>Angular Moderno: Standalone Components</h2><p>A partir de las versiones recientes de Angular, los <code>NgModules</code> son opcionales. Descubre cómo estructurar aplicaciones más limpias y directas con componentes Standalone.</p><h3>Tópicos:</h3><ul><li>Uso de la propiedad <code>standalone: true</code> e importación directa de dependencias.</li><li>Inyección moderna con la función <code>inject()</code>.</li><li>Gestión reactiva de estado con <strong>Angular Signals</strong> (<code>signal()</code>, <code>computed()</code>, <code>effect()</code>).</li><li>Configuración del enrutamiento con <code>provideRouter()</code> y <code>provideHttpClient()</code>.</li></ul>',
    3
) ON CONFLICT (id) DO NOTHING;

-- Quiz Questions for Lesson 1 (5 questions - 80% passing requires 4/5 correct)
INSERT INTO quiz_questions (id, lesson_id, question_text, options, correct_option_index)
VALUES 
(
    'd1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    '¿Cuál es el decorador utilizado en NestJS para definir una clase que encapsula controladores y proveedores?',
    '["@Injectable()", "@Module()", "@Component()", "@Controller()"]'::jsonb,
    1
),
(
    'd1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000001',
    '¿Qué rol cumplen los Controladores en una arquitectura NestJS?',
    '["Manejar la conexión con la base de datos", "Recibir peticiones HTTP y devolver respuestas al cliente", "Definir los tipos de TypeScript", "Configurar el compilador de Webpack"]'::jsonb,
    1
),
(
    'd1000000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000001',
    '¿Qué decorador debe tener una clase de servicio para poder ser inyectada en otras clases mediante IoC?',
    '["@Service()", "@Injectable()", "@Provider()", "@Autowired()"]'::jsonb,
    1
),
(
    'd1000000-0000-0000-0000-000000000004',
    'b1000000-0000-0000-0000-000000000001',
    '¿Cuál es el framework HTTP por defecto sobre el que opera NestJS?',
    '["Fastify", "Express", "Koa", "Hapi"]'::jsonb,
    1
),
(
    'd1000000-0000-0000-0000-000000000005',
    'b1000000-0000-0000-0000-000000000001',
    '¿Cómo se inyecta un servicio en el constructor de un controlador en NestJS?',
    '["constructor(private readonly service: MyService) {}", "new MyService() dentro del método", "service = Inject(MyService)", "No se puede inyectar en constructores"]'::jsonb,
    0
) ON CONFLICT (id) DO NOTHING;

-- Quiz Questions for Lesson 2
INSERT INTO quiz_questions (id, lesson_id, question_text, options, correct_option_index)
VALUES 
(
    'd2000000-0000-0000-0000-000000000001',
    'b2000000-0000-0000-0000-000000000002',
    '¿Qué decorador de TypeORM se utiliza para marcar una clase como una tabla en la base de datos?',
    '["@Table()", "@Entity()", "@Model()", "@Schema()"]'::jsonb,
    1
),
(
    'd2000000-0000-0000-0000-000000000002',
    'b2000000-0000-0000-0000-000000000002',
    '¿Cuál es el patrón que utiliza TypeORM para consultar y guardar entidades a través de clases dedicadas?',
    '["Active Record y Data Mapper (Repository)", "Singleton Pattern", "Factory Method", "Prototype Pattern"]'::jsonb,
    0
),
(
    'd2000000-0000-0000-0000-000000000003',
    'b2000000-0000-0000-0000-000000000002',
    '¿Cómo se inyecta un Repositorio de TypeORM en un servicio NestJS?',
    '["@InjectRepository(Entity) private repo: Repository<Entity>", "@GetRepo(Entity)", "new Repository(Entity)", "@UseRepository()"]'::jsonb,
    0
),
(
    'd2000000-0000-0000-0000-000000000004',
    'b2000000-0000-0000-0000-000000000002',
    '¿Qué tipo de relación representa @ManyToOne?',
    '["Muchos a Muchos", "Muchos a Uno", "Uno a Uno", "Uno a Muchos"]'::jsonb,
    1
),
(
    'd2000000-0000-0000-0000-000000000005',
    'b2000000-0000-0000-0000-000000000002',
    '¿Por qué se desaconseja "synchronize: true" en entornos de producción?',
    '["Porque ralentiza el servidor", "Porque puede alterar o eliminar columnas y datos reales automáticamente", "Porque no es compatible con PostgreSQL", "Porque deshabilita el pool de conexiones"]'::jsonb,
    1
) ON CONFLICT (id) DO NOTHING;

-- Quiz Questions for Lesson 3
INSERT INTO quiz_questions (id, lesson_id, question_text, options, correct_option_index)
VALUES 
(
    'd3000000-0000-0000-0000-000000000001',
    'b3000000-0000-0000-0000-000000000003',
    '¿Qué propiedad se define en el decorador @Component para habilitar Standalone Components en Angular?',
    '["standalone: true", "modular: false", "isolated: true", "exportDefault: true"]'::jsonb,
    0
),
(
    'd3000000-0000-0000-0000-000000000002',
    'b3000000-0000-0000-0000-000000000003',
    '¿Cuál es la nueva primitiva reactiva introducida en Angular para manejo síncrono de estado?',
    '["BehaviorSubject", "Signals (signal, computed, effect)", "EventEmitter", "NgZone"]'::jsonb,
    1
),
(
    'd3000000-0000-0000-0000-000000000003',
    'b3000000-0000-0000-0000-000000000003',
    '¿Qué función alternativa al constructor se usa modernamente en Angular para inyección de dependencias?',
    '["getService()", "inject()", "provide()", "useDependency()"]'::jsonb,
    1
),
(
    'd3000000-0000-0000-0000-000000000004',
    'b3000000-0000-0000-0000-000000000003',
    '¿Cómo se agregan directivas como CommonModule o FormsModule a un Standalone Component?',
    '["En app.module.ts", "En el arreglo imports: [...] del decorador @Component", "No se pueden importar en componentes standalone", "En el archivo angular.json"]'::jsonb,
    1
),
(
    'd3000000-0000-0000-0000-000000000005',
    'b3000000-0000-0000-0000-000000000003',
    '¿Qué función de Angular inicializa la aplicación con componentes standalone?',
    '["platformBrowserDynamic().bootstrapModule(AppModule)", "bootstrapApplication(AppComponent, appConfig)", "ngStart(AppComponent)", "startApplication()"]'::jsonb,
    1
) ON CONFLICT (id) DO NOTHING;

-- 6. Course Enrollments Table
CREATE TABLE IF NOT EXISTS course_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_user_course UNIQUE (user_id, course_id)
);

-- Seed Demo Student Enrollment in Course 1
INSERT INTO course_enrollments (id, user_id, course_id, status)
VALUES (
    'e1000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000001',
    'ACTIVE'
) ON CONFLICT (user_id, course_id) DO NOTHING;
