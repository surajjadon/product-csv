const express = require('express');
const cors = require('cors');
const db = require('./database');
const productRoutes = require('./routes/productRoutes');
const errorHandler = require('./middlewares/errorHandler');
require('./models/Product'); 
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
app.use('/api/v1', productRoutes);
app.get('/', (req, res) => {
    res.send("this is home page");
});
app.use((req, res, next) => {
    const error = new Error(`Not Found`);
    res.status(404);
    next(error);
});

app.use(errorHandler);

const startServer = async () => {
    try {
        await db.authenticate();
        console.log('Database connection started.');
        
        await db.sync();
        console.log('All models were launched.');

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start the server:', error);
    }
};

startServer();

