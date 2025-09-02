const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
app.use(express.json());

// SQLite (Render usa sistema de arquivos temporário)
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: '/tmp/database.sqlite',
  logging: false
});

// Modelo de Livro
const Book = sequelize.define('Book', {
  title: { type: DataTypes.STRING, allowNull: false },
  author: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  year: DataTypes.INTEGER
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
