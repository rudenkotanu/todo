require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(express.json());


const db = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'todo',
  password: '1111',
  port: 5432,
});

app.use(cors({
    origin: ['http://26.178.75.144:8080', 'http://another-domain.com'],
    credentials: true,
  }));
  
  app.use(session({
    secret: '112297hdow9ubso2873yrthueii84!',  
        resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
  }));
  

  const authMiddleware = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Необхідно увійти' });
    }
    next();
};
  
app.get('/check-session', (req, res) => {
    if (req.session.user) {
        res.json({ isAuthenticated: true });
    } else {
        res.json({ isAuthenticated: false });
    }
});


const getUserByEmail = async (email) => {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0]; 
};

app.get('/profile', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Ви не авторизовані' });
    }
    res.json({
        message: 'Дані профілю',
        userId: req.session.userId,
        username: req.session.username
    });
});

/**
 * @swaggerpaths:
  /login:
    post:
      summary: Логін користувача
      description: Осуществляет вход пользователя в систему
      operationId: login
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                  example: "user@example.com"
                password:
                  type: string
                  example: "password123"
      responses:
        '200':
          description: Вхід успішний
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: "Вхід успішний"
        '400':
          description: Невірні дані
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
                    example: "Невірний пароль"
  
  /profile:
    get:
      summary: Профіль користувача
      description: Повертає інформацію про поточного користувача, якщо він авторизований
      operationId: getProfile
      tags:
        - Users
      responses:
        '200':
          description: Дані профілю користувача
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: "Дані профілю"
                  userId:
                    type: string
                    example: "12345"
                  username:
                    type: string
                    example: "username123"
        '401':
          description: Користувач не авторизований
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: "Ви не авторизовані"
*/

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.connect()
    .then(client => {
        console.log('Connected to PostgreSQL');
        client.release();
    })
    .catch(err => {
        console.error('Database connection error:', err.stack);
    });

const transporter = nodemailer.createTransport({
    host: 'smtp.mailtrap.io',
    port: 587,
    auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
    },
});

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Tasks API',
            version: '1.0.0',
            description: 'API для керування завданнями та користувачами',
        },
    },
    apis: ['./server.js'], 
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Реєстрація нового користувача
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Користувача зареєстровано
 *       400:
 *         description: Некоректні дані
 */
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body; 

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Некоректний email' });
    }

    if (!passwordRegex.test(password)) {
        return res.status(400).json({ message: 'Пароль повинен містити від 6 до 20 символів, одну велику літеру, одну малу літеру і цифру' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Користувач з таким email вже існує' });
        }

        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
            [username, email, hashedPassword] 
        );

        res.status(201).json({ message: 'Користувача зареєстровано' });

    } catch (error) {
        console.error('Error occurred while registering:', error.message);
        res.status(500).json({ message: 'Виникла помилка на сервері' });
    }
});


/**
 * @swagger
 * /login:
 *   post:
 *     summary: Вхід користувача
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Вхід успішний
 *       400:
 *         description: Невірні дані
 */
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Будь ласка, введіть email та пароль' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Користувача не знайдено' });
        }

        const user = result.rows[0];

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Невірний пароль' });
        }

        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.email = user.email;

        res.json({ message: 'Вхід успішний', user: { id: user.id, username: user.username, email: user.email } });

    } catch (error) {
        console.error('Error occurred while logging in:', error.message);
        res.status(500).json({ message: 'Виникла помилка на сервері' });
    }
});


/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Отримати всі завдання
 *     responses:
 *       200:
 *         description: Список завдань
 */
app.get('/tasks', authMiddleware, async (req, res) => {
    try {
        const userId = req.session.userId;
        const tasks = await db.query('SELECT * FROM tasks WHERE user_id = $1', [userId]);
        res.json(tasks.rows);
    } catch (error) {
        res.status(500).json({ message: 'Помилка при отриманні завдань' });
    }
});

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Додати нове завдання
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Завдання створено
 */
app.post('/tasks', authMiddleware, async (req, res) => {
    try {
        const userId = req.session ? req.session.userId : req.user.id;

        if (!userId) {
            return res.status(400).json({ message: 'Немає авторизованого користувача' });
        }

        const { title, description } = req.body;

        if (!title || !description) {
            return res.status(400).json({ message: 'Заповніть всі поля' });
        }

        console.log('Adding task:', title, description, userId); 

        const newTask = await db.query(
            'INSERT INTO tasks (title, description, user_id) VALUES ($1, $2, $3) RETURNING *',
            [title, description, userId]
        );

        console.log('New task created:', newTask.rows[0]); 

        res.status(201).json(newTask.rows[0]);
    } catch (error) {
        console.error('Error creating task:', error); 
        res.status(500).json({ message: 'Помилка при створенні завдання' });
    }
});

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Оновити завдання
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Завдання оновлено
 */
app.put('/tasks/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { title, description, status } = req.body;

    try {
        const result = await pool.query(
            'UPDATE tasks SET title = $1, description = $2, status = $3 WHERE id = $4 AND user_id = $5 RETURNING *',
            [title, description, status, id, req.session.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Завдання не знайдено або не ваше' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error occurred while updating task:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Видалити завдання
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Завдання видалено
 */
app.delete('/tasks/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, req.session.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Завдання не знайдено або не ваше' });
        }

        res.json({ message: 'Завдання видалено' });
    } catch (error) {
        console.error('Error occurred while deleting task:', error.message);
        res.status(500).json({ error: error.message });
    }
});
app.get('/', (req, res) => {
    res.send('Сервер працює! Перейдіть до /api-docs для перегляду документації.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
/**
 * @swagger
 * /reset-password:
 *   post:
 *     summary: Ініціація скидання паролю
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Лист з інструкціями надіслано
 *       400:
 *         description: Некоректний email
 */
const generateResetToken = async (email) => {
    const secret = process.env.RESET_SECRET || 'super-secret'; 
    const timestamp = Date.now();
    const data = `${email}.${timestamp}`;
    const hmac = crypto.createHmac('sha256', secret).update(data).digest('hex');
    return Buffer.from(`${email}.${timestamp}.${hmac}`).toString('base64');
};

const verifyResetToken = async (token) => {
    const secret = process.env.RESET_SECRET || 'super-secret';
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [email, timestamp, signature] = decoded.split('.');

    if (!email || !timestamp || !signature) {
        throw new Error('Невалідний токен');
    }

    const expiry = 60 * 60 * 1000;
    if (Date.now() - Number(timestamp) > expiry) {
        throw new Error('Термін дії токена вичерпано');
    }

    const validSignature = crypto.createHmac('sha256', secret)
        .update(`${email}.${timestamp}`)
        .digest('hex');

    if (signature !== validSignature) {
        throw new Error('Недійсний токен');
    }

    return { email };
};


app.post('/reset-password', async (req, res) => {
    const { email } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Некоректний email' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Користувача з таким email не знайдено' });
        }

        const user = result.rows[0];

        const resetToken = await generateResetToken(email);

        const mailOptions = {
            from: 'no-reply@example.com',
            to: email,
            subject: 'Скидання паролю',
            text: `Використовуйте наступний токен для скидання паролю: ${resetToken}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(error);
            }
            console.log('Email sent: ' + info.response);
        });

        res.json({ message: 'Лист з інструкціями надіслано' });
    } catch (error) {
        console.error('Error occurred while resetting password:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;
    if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ error: 'Пароль повинен містити від 6 до 20 символів, одну велику літеру, одну малу літеру і цифру' });
    }

    try {
        const user = await verifyResetToken(token);

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await pool.query('UPDATE users SET password_hash = $1, reset_token = NULL WHERE reset_token = $2', [hashedPassword, token]);

        res.json({ message: 'Пароль оновлено' });
    } catch (error) {
        console.error('Error occurred while updating password:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /reset-password/{token}:
 *   post:
 *     summary: Оновити пароль після скидання
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Пароль оновлено
 *       400:
 *         description: Некоректний токен
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Отримати всіх користувачів
 *     responses:
 *       200:
 *         description: Список всіх користувачів
 */
app.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, email FROM users');
        res.json(result.rows);
    } catch (error) {
        console.error('Error occurred while fetching users:', error.message);
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Видалити користувача
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Користувач видалений
 *       404:
 *         description: Користувач не знайдений
 */

app.delete('/users/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Користувача з таким id не знайдено' });
        }

        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ message: 'Користувача видалено' });
    } catch (error) {
        console.error('Error occurred while deleting user:', error.message);
        res.status(500).json({ error: error.message });
    }
});
