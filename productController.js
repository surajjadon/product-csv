const { Op } = require('sequelize');
const csv = require('csv-parser');
const { Readable } = require('stream');
const Product = require('../models/Product');
const { productSchema } = require('../middlewares/validation');
const db = require('../database');

const uploadProducts = async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file was uploaded.' });
    }

    const dataRows = [];
    const rejectedEntries = [];
    const fileStream = Readable.from(req.file.buffer.toString('utf8'));

    fileStream
        .pipe(csv())
        .on('data', (row) => dataRows.push(row))
        .on('end', async () => {
            const productsToProcess = [];
            for (const item of dataRows) {
                try {
                    await productSchema.validateAsync(item, { abortEarly: false });
                    if (parseFloat(item.price) > parseFloat(item.mrp)) {
                        throw new Error('Price cannot be greater than MRP.');
                    }
                    productsToProcess.push(item);
                } catch (error) {
                    rejectedEntries.push({ 
                        sku: item.sku || 'SKU_MISSING', 
                        error: error.message 
                    });
                }
            }
            
            const transaction = await db.transaction();
            try {
                if (productsToProcess.length > 0) {
                    for (const productData of productsToProcess) {
                        const existingProduct = await Product.findOne({ 
                            where: { sku: productData.sku },
                            transaction
                        });

                        if (existingProduct) {
                            await existingProduct.update(productData, { transaction });
                        } else {
                            await Product.create(productData, { transaction });
                        }
                    }
                }
                
                await transaction.commit();

                res.status(201).json({
                    message: `CSV processing complete. ${dataRows.length} rows were analyzed.`,
                    stored_count: productsToProcess.length,
                    failed_count: rejectedEntries.length,
                    failures: rejectedEntries,
                });
            } catch (dbError) {
                await transaction.rollback();
                console.error('Database transaction failed:', dbError);
                return next(new Error('Failed to save products to the database. Operation was cancelled.'));
            }
        });
};


const getProducts = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        const { count, rows } = await Product.findAndCountAll({ limit, offset });

        res.json({ 
            total_products: count, 
            current_page: page, 
            page_limit: limit, 
            products: rows 
        });
    } catch (error) {
        next(error);
    }
};

const searchProducts = async (req, res, next) => {
    try {
        const { brand, color, minPrice, maxPrice } = req.query;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        const searchConditions = {};
        
        if (brand) {
            searchConditions[Op.or] = [
                { brand: { [Op.like]: `%${brand}%` } },
                { name: { [Op.like]: `%${brand}%` } }
            ];
        }
        if (color) {
            searchConditions.color = { [Op.like]: `%${color}%` };
        }
        if (minPrice || maxPrice) {
            searchConditions.price = {};
            if (minPrice) searchConditions.price[Op.gte] = parseFloat(minPrice);
            if (maxPrice) searchConditions.price[Op.lte] = parseFloat(maxPrice);
        }

        const { count, rows } = await Product.findAndCountAll({
            where: searchConditions,
            limit,
            offset,
        });
        
        res.json({ 
            total_found: count, 
            current_page: page, 
            page_limit: limit, 
            products: rows 
        });
    } catch (error) {
        next(error);
    }
};

const deleteProduct = async (req, res, next) => {
    try {
        const { sku } = req.params;
        const product = await Product.findByPk(sku);

        if (!product) {
            return res.status(404).json({ message: `Product with SKU '${sku}' was not found.` });
        }

        await product.destroy();
        res.status(200).json({ message: 'Product removed successfully.' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    uploadProducts,
    getProducts,
    searchProducts,
    deleteProduct,
};

