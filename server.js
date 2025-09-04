// ======================================
// BIBLIOTECAS NECESSÁRIAS
// ======================================
const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const { createServer } = require('http');      // ← NOVO: Para criar servidor HTTP
const { Server } = require('socket.io');      // ← NOVO: Para WebSockets

// ======================================
// CONFIGURAÇÃO DO APP
// ======================================
const app = express();
app.use(cors());
app.use(express.json());

// ======================================
// BANCO DE DADOS (SQLite)
// ======================================
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: '/tmp/database.sqlite',
  logging: false
});

// ======================================
// MODELO DE LIVRO (COM VALIDAÇÃO)
// ======================================
const Book = sequelize.define('Book', {
  title: { 
    type: DataTypes.STRING, 
    allowNull: false,
    validate: {
      notEmpty: { msg: "Título não pode ser vazio" }
    }
  },
  author: { 
    type: DataTypes.STRING, 
    allowNull: false,
    validate: {
      notEmpty: { msg: "Autor não pode ser vazio" }
    }
  },
  description: DataTypes.TEXT,
  year: { 
    type: DataTypes.INTEGER,
    validate: {
      isInt: { msg: "Ano deve ser um número válido" },
      min: { args: [1000], msg: "Ano deve ser maior que 1000" },
      max: { args: [new Date().getFullYear()], msg: "Ano não pode ser futuro" }
    }
  }
});

// ======================================
// SINCRONIZAR BANCO DE DADOS
// ======================================
sequelize.sync();

// ======================================
// CONFIGURAÇÃO DO SERVIDOR COM WEBSOCKETS
// ======================================
const server = createServer(app);              // ← NOVO: Cria servidor HTTP
const io = new Server(server, {                 // ← NOVO: Configura WebSockets
  cors: {
    origin: "*",                               // Permite qualquer origem
    methods: ["GET", "POST"]                  // Métodos permitidos
  }
});

// ======================================
// COMUNICAÇÃO EM TEMPO REAL (WEBSOCKETS)
// ======================================
io.on('connection', (socket) => {
  console.log('✅ Alguém se conectou via WebSocket!');
  
  // Quando receber sinal de novo livro
  socket.on('novo-livro', () => {
    console.log('📚 Novo livro adicionado, notificando todos...');
    io.emit('atualizar-livros');               // Avisa todos os usuários
  });
  
  // Quando alguém desconectar
  socket.on('disconnect', () => {
    console.log('❌ Alguém desconectou do WebSocket');
  });
});

// ======================================
// ROTAS DA API
// ======================================

// GET - Listar todos os livros
app.get('/api/books', async (req, res) => {
  try {
    const books = await Book.findAll();
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - Adicionar novo livro
app.post('/api/books', async (req, res) => {
  try {
    const book = await Book.create(req.body);
    
    // ← NOVO: Emite sinal para todos os usuários conectados
    io.emit('atualizar-livros');
    
    res.status(201).json(book);
  } catch (error) {
    // Erros de validação do Sequelize
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(err => err.message);
      return res.status(400).json({ 
        error: "Dados inválidos",
        details: messages 
      });
    }
    // Outros erros
    res.status(400).json({ error: error.message });
  }
});

// DELETE - Excluir um livro
app.delete('/api/books/:id', async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id);
    if (book) {
      await book.destroy();
      
      // ← NOVO: Emite sinal para todos os usuários conectados
      io.emit('atualizar-livros');
      
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Livro não encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ======================================
// HEALTH CHECK PARA O RENDER
// ======================================
app.get('/', (req, res) => {
  res.send('Backend de livros funcionando com WebSockets!');
});

// ======================================
// INICIAR SERVIDOR
// ======================================
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {                           // ← ALTERADO: server.listen em vez de app.listen
  console.log(`🚀 Servidor com WebSockets rodando na porta ${PORT}`);
});