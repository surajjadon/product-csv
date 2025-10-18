const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadProducts, getProducts, searchProducts,deleteProduct} = require('../controllers/productController');

//file uplaod
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//routes
router.get('/', (req, res) => {
    res.status(200).send("Hi,welcome to the Product Api");
});
router.post('/upload', upload.single('file'), uploadProducts);
router.get('/products', getProducts);
router.get('/products/search', searchProducts);
router.delete('/products/:sku', deleteProduct);

module.exports = router;

