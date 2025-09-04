const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
app.use(cors());
app.use(express.json());

// SQLite (Render usa sistema de arquivos temporário)
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: '/tmp/database.sqlite',
  logging: false
});

// Modelo de Livro (COM VALIDAÇÃO)
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

// Sincronizar banco de dados
sequelize.sync();

// Rotas da API
app.get('/api/books', async (req, res) => {
  const books = await Book.findAll();
  res.json(books);
});

app.post('/api/books', async (req, res) => {
  try {
    const book = await Book.create(req.body);
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

// Health check para o Render
app.get('/', (req, res) => {
  res.send('Backend de livros funcionando!');
});

// Iniciar servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});