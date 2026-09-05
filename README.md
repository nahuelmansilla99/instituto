# 🎓 Instituto Virtual - Plataforma de E-Learning (MVP)

Plataforma moderna y escalable de e-learning construida con **NestJS**, **Angular (Standalone Components)**, **PostgreSQL (TypeORM)** y **Docker Compose**.

Cuenta con un sistema de progresión y desbloqueo secuencial de clases condicionado a la aprobación de cuestionarios (Quiz) con un umbral del 60%.

---

## 🚀 Inicio Rápido con Docker Compose

La forma más sencilla de levantar toda la infraestructura (Base de Datos + Backend + Frontend) es ejecutando:

```bash
# 1. Clona o ubícate en el directorio del proyecto
cd elearning-platform

# 2. Levanta todos los servicios con Docker Compose
docker-compose up --build
```

- **Frontend (Angular):** [http://localhost:4200](http://localhost:4200)
- **Backend API (NestJS):** [http://localhost:3000](http://localhost:3000)
- **Base de Datos PostgreSQL:** Puerto `5432` (`postgres:postgres@localhost:5432/elearning_db`)

*(La base de datos se inicializa y se sembrará automáticamente con los cursos y preguntas de prueba gracias al archivo `seed.sql`).*

---

## 🛠️ Ejecución Local (Sin Docker)

Si prefieres ejecutar el Backend y Frontend de manera independiente en tu entorno de desarrollo local:

### 1. Requisitos Previos
- Node.js 18+ o 20+
- PostgreSQL en ejecución (o levanta solo la DB con `docker-compose up -d postgres`)

### 2. Configuración y Ejecución del Backend
```bash
cd backend

# Instalar dependencias
npm install

# Sembrar datos de prueba (Cursos, Lecciones, Quizzes y Usuarios)
npm run seed

# Iniciar servidor de desarrollo
npm run start:dev
```
El backend estará disponible en `http://localhost:3000`.

### 3. Configuración y Ejecución del Frontend
```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor Angular
npm start
```
El frontend estará disponible en `http://localhost:4200`.

---

## 🔑 Credenciales de Prueba Preconfiguradas

| Rol | Correo Electrónico | Contraseña |
| :--- | :--- | :--- |
| **Estudiante** | `alumno@instituto.com` | `student123` |
| **Administrador** | `admin@instituto.com` | `admin123` |

*(En la pantalla de Login hay botones de acceso rápido para rellenar estas credenciales con un solo clic).*

---

## 🗄️ Guía para Insertar Contenido Manualmente (TablePlus / DBeaver)

Como se especificó en el alcance arquitectónico, no hay un panel de administración en el frontend para subir contenido. Puedes insertar nuevos cursos, clases y preguntas directamente desde tu cliente SQL favorito:

### 1. Insertar un Nuevo Curso
```sql
INSERT INTO courses (id, title, description, thumbnail_url)
VALUES (
    uuid_generate_v4(),
    'Curso de Arquitectura Limpia',
    'Aprende a diseñar software desacoplado y mantenible.',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800'
);
```

### 2. Insertar una Lección (HTML o Video Embebido)
```sql
INSERT INTO lessons (id, course_id, title, content, order_number)
VALUES (
    uuid_generate_v4(),
    'ID_DEL_CURSO_CREADO_ARRIBA',
    '1. Introducción a Clean Architecture',
    '<h2>Bienvenido a la clase</h2><p>Texto o diapositiva...</p><iframe src="https://www.youtube.com/embed/XXXXX"></iframe>',
    1
);
```

### 3. Insertar Preguntas para el Quiz
> **Nota de Seguridad:** `correct_option_index` es un índice basado en 0 (0 = primera opción, 1 = segunda opción, etc.).

```sql
INSERT INTO quiz_questions (id, lesson_id, question_text, options, correct_option_index)
VALUES (
    uuid_generate_v4(),
    'ID_DE_LA_LECCION_CREADA_ARRIBA',
    '¿Cuál es la capa más interna en Clean Architecture?',
    '["Controladores", "Entidades / Dominio", "Bases de Datos", "Interfaces de Usuario"]'::jsonb,
    1
);
```

---

## 🧠 Lógica del Motor de Progresión (Core)

1. **Lección 1:** Está disponible inmediatamente para cualquier nuevo alumno.
2. **Lecciones Siguientes:** Comienzan en estado `LOCKED` (Bloqueadas).
3. **Cuestionario:** Al finalizar una lección, el estudiante envía sus respuestas a `POST /lessons/:id/quiz/submit`.
4. **Evaluación en Servidor:**
   - Si el estudiante obtiene **$\ge 60\%$**:
     - La clase actual se marca como `COMPLETED` y guarda el puntaje.
     - La siguiente lección en orden (`order_number`) pasa automáticamente a `AVAILABLE`.
     - El frontend muestra un mensaje de felicitaciones y el botón "Siguiente Lección".
   - Si el estudiante obtiene **$< 60\%$**:
     - La clase se mantiene en `AVAILABLE`.
     - Las clases posteriores permanecen bloqueadas.
     - El frontend muestra el botón "Reintentar Cuestionario".

---

## 📡 Referencia de la API REST

### Autenticación
- `POST /auth/register` - Registrar nuevo alumno (`{ name, email, password }`)
- `POST /auth/login` - Iniciar sesión (`{ email, password }`) -> Retorna `{ user, token }`
- `GET /auth/me` - Obtener datos del usuario autenticado (Requiere `Bearer Token`)

### Cursos y Clases
- `GET /courses` - Listar cursos con % de progreso del estudiante
- `GET /courses/:id` - Detalle del curso y temario con estado de cada clase
- `GET /lessons/:id` - Contenido de la clase y preguntas del cuestionario (protegidas sin respuestas)

### Evaluaciones
- `POST /lessons/:id/quiz/submit` - Enviar respuestas del cuestionario (`{ answers: [{ questionId, selectedOptionIndex }] }`)
