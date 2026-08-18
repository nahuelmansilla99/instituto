import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, Course, Lesson, QuizQuestion, CourseEnrollment, EnrollmentStatus } from '../entities';

@Injectable()
export class DatabaseSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseSeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(Lesson)
    private readonly lessonRepo: Repository<Lesson>,
    @InjectRepository(QuizQuestion)
    private readonly quizRepo: Repository<QuizQuestion>,
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepo: Repository<CourseEnrollment>,
  ) {}

  async onApplicationBootstrap() {
    try {
      this.logger.log('Verificando inicialización y esquema de base de datos...');
      // Garantizar que las columnas necesarias existan en las tablas aunque el volumen de Postgres ya estuviera creado
      await this.courseRepo.query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS meet_url VARCHAR(500);`);
      await this.lessonRepo.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS meet_url VARCHAR(500);`);
      await this.lessonRepo.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS presentation_url VARCHAR(500);`);
      await this.lessonRepo.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS presentation_filename VARCHAR(255);`);
      await this.lessonRepo.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS available_at TIMESTAMP WITH TIME ZONE;`);

      // Asegurar que las clases de prueba tengan la presentación configurada si estaba nula
      await this.lessonRepo.query(`
        UPDATE lessons 
        SET presentation_url = '/api/uploads/presentations/clase1-nestjs-angular.pptx',
            presentation_filename = 'Clase 1 - Introducción a NestJS.pptx'
        WHERE id = 'l1000000-0000-0000-0000-000000000001' AND presentation_url IS NULL;
      `);
      await this.lessonRepo.query(`
        UPDATE lessons 
        SET presentation_url = '/api/uploads/presentations/clase1-nestjs-angular.pptx',
            presentation_filename = 'Clase 2 - TypeORM y PostgreSQL.pptx'
        WHERE id = 'l2000000-0000-0000-0000-000000000002' AND presentation_url IS NULL;
      `);

      // Crear tabla de matriculaciones si no existe
      await this.courseRepo.query(`
        CREATE TABLE IF NOT EXISTS course_enrollments (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          status VARCHAR(50) DEFAULT 'ACTIVE',
          enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_user_course UNIQUE (user_id, course_id)
        );
      `);

      await this.seedUsers();
      await this.seedCoursesAndLessons();
      await this.seedEnrollments();
      this.logger.log('✅ Base de datos y datos de prueba sincronizados correctamente.');
    } catch (error) {
      this.logger.warn(`Advertencia al sincronizar base de datos: ${error.message}`);
    }
  }

  private async seedEnrollments() {
    const student = await this.userRepo.findOne({ where: { email: 'alumno@instituto.com' } });
    if (!student) return;

    const course1 = await this.courseRepo.findOne({ where: { id: 'c1000000-0000-0000-0000-000000000001' } });
    if (course1) {
      const existing = await this.enrollmentRepo.findOne({
        where: { userId: student.id, courseId: course1.id },
      });
      if (!existing) {
        const enrollment = this.enrollmentRepo.create({
          userId: student.id,
          courseId: course1.id,
          status: EnrollmentStatus.ACTIVE,
        });
        await this.enrollmentRepo.save(enrollment);
      }
    }
  }

  private async seedUsers() {
    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash('admin123', salt);
    const studentPasswordHash = await bcrypt.hash('student123', salt);

    // Admin
    let admin = await this.userRepo.findOne({ where: { email: 'admin@instituto.com' } });
    if (!admin) {
      admin = this.userRepo.create({
        id: 'a0000000-0000-0000-0000-000000000001',
        email: 'admin@instituto.com',
        passwordHash: adminPasswordHash,
        name: 'Profesor Administrador',
        role: UserRole.ADMIN,
      });
    } else {
      admin.passwordHash = adminPasswordHash;
    }
    await this.userRepo.save(admin);

    // Student
    let student = await this.userRepo.findOne({ where: { email: 'alumno@instituto.com' } });
    if (!student) {
      student = this.userRepo.create({
        id: 'a0000000-0000-0000-0000-000000000002',
        email: 'alumno@instituto.com',
        passwordHash: studentPasswordHash,
        name: 'Juan Pérez (Alumno)',
        role: UserRole.STUDENT,
      });
    } else {
      student.passwordHash = studentPasswordHash;
    }
    await this.userRepo.save(student);
  }

  private async seedCoursesAndLessons() {
    // Course 1
    let course1 = await this.courseRepo.findOne({
      where: { id: 'c1000000-0000-0000-0000-000000000001' },
    });
    if (!course1) {
      course1 = this.courseRepo.create({
        id: 'c1000000-0000-0000-0000-000000000001',
        title: 'Masterclass: Desarrollo Full-Stack con NestJS y Angular',
        description:
          'Aprende a construir aplicaciones escalables desde cero utilizando TypeScript en el backend y frontend con arquitectura modular, base de datos relacional y autenticación JWT.',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=60',
        meetUrl: 'https://meet.google.com/abc-defg-hij',
      });
      await this.courseRepo.save(course1);
    }

    // Course 2
    let course2 = await this.courseRepo.findOne({
      where: { id: 'c2000000-0000-0000-0000-000000000002' },
    });
    if (!course2) {
      course2 = this.courseRepo.create({
        id: 'c2000000-0000-0000-0000-000000000002',
        title: 'Arquitectura de Software y Patrones de Diseño Modernos',
        description:
          'Domina los principios SOLID, Clean Architecture, Domain Driven Design (DDD) y patrones arquitectónicos para crear sistemas robustos y testeables.',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=60',
      });
      await this.courseRepo.save(course2);
    }

    // Lesson 1
    let lesson1 = await this.lessonRepo.findOne({
      where: { id: 'l1000000-0000-0000-0000-000000000001' },
    });
    if (!lesson1) {
      lesson1 = this.lessonRepo.create({
        id: 'l1000000-0000-0000-0000-000000000001',
        courseId: course1.id,
        title: '1. Introducción a la Arquitectura Modular de NestJS',
        orderNumber: 1,
        presentationUrl: '/api/uploads/presentations/clase1-nestjs-angular.pptx',
        presentationFilename: 'Clase 1 - Introducción a NestJS.pptx',
        content: `<h2>Bienvenido al curso</h2><p>En esta lección inaugural exploraremos los conceptos esenciales de <strong>NestJS</strong>, el framework de Node.js progresivo construido sobre Express/Fastify y potenciado por TypeScript.</p><h3>Puntos clave:</h3><ul><li><strong>Módulos:</strong> Organización estructural mediante el decorador <code>@Module()</code>.</li><li><strong>Controladores:</strong> Encargados de recibir peticiones HTTP con <code>@Controller()</code>.</li><li><strong>Proveedores / Servicios:</strong> Lógica de negocio inyectable con <code>@Injectable()</code>.</li><li><strong>Inyección de Dependencias:</strong> El contenedor IoC gestiona el ciclo de vida.</li></ul><div class="video-container" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;margin:24px 0;"><iframe src="https://www.youtube.com/embed/0M8AYU_hPas" title="NestJS Introduction" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div>`,
      });
      await this.lessonRepo.save(lesson1);

      const questionsL1 = [
        {
          id: 'q1000000-0000-0000-0000-000000000001',
          lessonId: lesson1.id,
          questionText: '¿Cuál es el decorador utilizado en NestJS para definir una clase que encapsula controladores y proveedores?',
          options: ['@Injectable()', '@Module()', '@Component()', '@Controller()'],
          correctOptionIndex: 1,
        },
        {
          id: 'q1000000-0000-0000-0000-000000000002',
          lessonId: lesson1.id,
          questionText: '¿Qué rol cumplen los Controladores en una arquitectura NestJS?',
          options: [
            'Manejar la conexión con la base de datos',
            'Recibir peticiones HTTP y devolver respuestas al cliente',
            'Definir los tipos de TypeScript',
            'Configurar el compilador de Webpack',
          ],
          correctOptionIndex: 1,
        },
        {
          id: 'q1000000-0000-0000-0000-000000000003',
          lessonId: lesson1.id,
          questionText: '¿Qué decorador debe tener una clase de servicio para poder ser inyectada en otras clases mediante IoC?',
          options: ['@Service()', '@Injectable()', '@Provider()', '@Autowired()'],
          correctOptionIndex: 1,
        },
        {
          id: 'q1000000-0000-0000-0000-000000000004',
          lessonId: lesson1.id,
          questionText: '¿Cuál es el framework HTTP por defecto sobre el que opera NestJS?',
          options: ['Fastify', 'Express', 'Koa', 'Hapi'],
          correctOptionIndex: 1,
        },
        {
          id: 'q1000000-0000-0000-0000-000000000005',
          lessonId: lesson1.id,
          questionText: '¿Cómo se inyecta un servicio en el constructor de un controlador en NestJS?',
          options: [
            'constructor(private readonly service: MyService) {}',
            'new MyService() dentro del método',
            'service = Inject(MyService)',
            'No se puede inyectar en constructores',
          ],
          correctOptionIndex: 0,
        },
      ];

      for (const q of questionsL1) {
        const qEntity = this.quizRepo.create(q);
        await this.quizRepo.save(qEntity);
      }
    }

    // Lesson 2
    let lesson2 = await this.lessonRepo.findOne({
      where: { id: 'l2000000-0000-0000-0000-000000000002' },
    });
    if (!lesson2) {
      lesson2 = this.lessonRepo.create({
        id: 'l2000000-0000-0000-0000-000000000002',
        courseId: course1.id,
        title: '2. Persistencia de Datos con TypeORM y PostgreSQL',
        orderNumber: 2,
        content: `<h2>Persistencia Relacional</h2><p>En esta clase conectamos nuestra API a <strong>PostgreSQL</strong> mediante <strong>TypeORM</strong>, un potente Object-Relational Mapper para TypeScript.</p><h3>Contenido:</h3><ul><li>Definición de entidades con <code>@Entity()</code> y columnas con <code>@Column()</code>.</li><li>Relaciones <code>@ManyToOne()</code>, <code>@OneToMany()</code> y <code>@OneToOne()</code>.</li><li>Uso de Repositorios (<code>Repository&lt;T&gt;</code>) para consultas CRUD eficientes.</li><li>Transacciones y migraciones en entornos de producción.</li></ul><div class="code-block" style="background:#1e293b;color:#f8fafc;padding:16px;border-radius:8px;font-family:monospace;margin:16px 0;"><code>@Entity()<br>export class User {<br>&nbsp;&nbsp;@PrimaryGeneratedColumn('uuid')<br>&nbsp;&nbsp;id: string;<br><br>&nbsp;&nbsp;@Column({ unique: true })<br>&nbsp;&nbsp;email: string;<br>}</code></div>`,
      });
      await this.lessonRepo.save(lesson2);

      const questionsL2 = [
        {
          id: 'q2000000-0000-0000-0000-000000000001',
          lessonId: lesson2.id,
          questionText: '¿Qué decorador de TypeORM se utiliza para marcar una clase como una tabla en la base de datos?',
          options: ['@Table()', '@Entity()', '@Model()', '@Schema()'],
          correctOptionIndex: 1,
        },
        {
          id: 'q2000000-0000-0000-0000-000000000002',
          lessonId: lesson2.id,
          questionText: '¿Cuál es el patrón que utiliza TypeORM para consultar y guardar entidades a través de clases dedicadas?',
          options: [
            'Active Record y Data Mapper (Repository)',
            'Singleton Pattern',
            'Factory Method',
            'Prototype Pattern',
          ],
          correctOptionIndex: 0,
        },
        {
          id: 'q2000000-0000-0000-0000-000000000003',
          lessonId: lesson2.id,
          questionText: '¿Cómo se inyecta un Repositorio de TypeORM en un servicio NestJS?',
          options: [
            '@InjectRepository(Entity) private repo: Repository<Entity>',
            '@GetRepo(Entity)',
            'new Repository(Entity)',
            '@UseRepository()',
          ],
          correctOptionIndex: 0,
        },
        {
          id: 'q2000000-0000-0000-0000-000000000004',
          lessonId: lesson2.id,
          questionText: '¿Qué tipo de relación representa @ManyToOne?',
          options: ['Muchos a Muchos', 'Muchos a Uno', 'Uno a Uno', 'Uno a Muchos'],
          correctOptionIndex: 1,
        },
        {
          id: 'q2000000-0000-0000-0000-000000000005',
          lessonId: lesson2.id,
          questionText: '¿Por qué se desaconseja "synchronize: true" en entornos de producción?',
          options: [
            'Porque ralentiza el servidor',
            'Porque puede alterar o eliminar columnas y datos reales automáticamente',
            'Porque no es compatible con PostgreSQL',
            'Porque deshabilita el pool de conexiones',
          ],
          correctOptionIndex: 1,
        },
      ];

      for (const q of questionsL2) {
        const qEntity = this.quizRepo.create(q);
        await this.quizRepo.save(qEntity);
      }
    }

    // Lesson 3
    let lesson3 = await this.lessonRepo.findOne({
      where: { id: 'l3000000-0000-0000-0000-000000000003' },
    });
    if (!lesson3) {
      lesson3 = this.lessonRepo.create({
        id: 'l3000000-0000-0000-0000-000000000003',
        courseId: course1.id,
        title: '3. Frontend Reactivo con Angular Standalone Components',
        orderNumber: 3,
        content: `<h2>Angular Moderno: Standalone Components</h2><p>A partir de las versiones recientes de Angular, los <code>NgModules</code> son opcionales. Descubre cómo estructurar aplicaciones más limpias y directas con componentes Standalone.</p><h3>Tópicos:</h3><ul><li>Uso de la propiedad <code>standalone: true</code> e importación directa de dependencias.</li><li>Inyección moderna con la función <code>inject()</code>.</li><li>Gestión reactiva de estado con <strong>Angular Signals</strong> (<code>signal()</code>, <code>computed()</code>, <code>effect()</code>).</li><li>Configuración del enrutamiento con <code>provideRouter()</code> y <code>provideHttpClient()</code>.</li></ul>`,
      });
      await this.lessonRepo.save(lesson3);

      const questionsL3 = [
        {
          id: 'q3000000-0000-0000-0000-000000000001',
          lessonId: lesson3.id,
          questionText: '¿Qué propiedad se define en el decorador @Component para habilitar Standalone Components en Angular?',
          options: ['standalone: true', 'modular: false', 'isolated: true', 'exportDefault: true'],
          correctOptionIndex: 0,
        },
        {
          id: 'q3000000-0000-0000-0000-000000000002',
          lessonId: lesson3.id,
          questionText: '¿Cuál es la nueva primitiva reactiva introducida en Angular para manejo síncrono de estado?',
          options: ['BehaviorSubject', 'Signals (signal, computed, effect)', 'EventEmitter', 'NgZone'],
          correctOptionIndex: 1,
        },
        {
          id: 'q3000000-0000-0000-0000-000000000003',
          lessonId: lesson3.id,
          questionText: '¿Qué función alternativa al constructor se usa modernamente en Angular para inyección de dependencias?',
          options: ['getService()', 'inject()', 'provide()', 'useDependency()'],
          correctOptionIndex: 1,
        },
        {
          id: 'q3000000-0000-0000-0000-000000000004',
          lessonId: lesson3.id,
          questionText: '¿Cómo se agregan directivas como CommonModule o FormsModule a un Standalone Component?',
          options: [
            'En app.module.ts',
            'En el arreglo imports: [...] del decorador @Component',
            'No se pueden importar en componentes standalone',
            'En el archivo angular.json',
          ],
          correctOptionIndex: 1,
        },
        {
          id: 'q3000000-0000-0000-0000-000000000005',
          lessonId: lesson3.id,
          questionText: '¿Qué función de Angular inicializa la aplicación con componentes standalone?',
          options: [
            'platformBrowserDynamic().bootstrapModule(AppModule)',
            'bootstrapApplication(AppComponent, appConfig)',
            'ngStart(AppComponent)',
            'startApplication()',
          ],
          correctOptionIndex: 1,
        },
      ];

      for (const q of questionsL3) {
        const qEntity = this.quizRepo.create(q);
        await this.quizRepo.save(qEntity);
      }
    }
  }
}
