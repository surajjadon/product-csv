const Joi = require('joi');
const productSchema = Joi.object({
    sku: Joi.string().required(),
    name: Joi.string().required(),
    brand: Joi.string().required(),
    color: Joi.string().allow(null, ''),
    size: Joi.string().allow(null, ''),
    mrp: Joi.number().required().min(0),
    price: Joi.number().required().min(0),
    quantity: Joi.number().integer().required().min(0),
});

module.exports = {
    productSchema,
};
