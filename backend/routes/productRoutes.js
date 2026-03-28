const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const {
  createWooProduct,
  updateWooProduct,
  deleteWooProduct,
  formatWooError
} = require('../services/wooCommerce');

const normalizeProductPayload = (payload) => ({
  name: payload.name,
  price: payload.price,
  description: payload.description,
  category: payload.category,
  attributes: {
    size: payload.attributes?.size || '',
    color: payload.attributes?.color || ''
  },
  stock: payload.stock
});

router.post('/', async (req, res) => {
  try {
    const product = new Product(normalizeProductPayload(req.body));
    const savedProduct = await product.save();

    try {
      const wooResult = await createWooProduct(savedProduct);
      if (wooResult.skipped) {
        return res.status(201).json({
          message: 'Product created locally. WooCommerce sync skipped.',
          localProduct: savedProduct,
          wooSkipped: true,
          wooReason: wooResult.reason
        });
      }

      savedProduct.wooCommerceProductId = wooResult.data.id || null;
      await savedProduct.save();

      return res.status(201).json({
        message: 'Product created and synced with WooCommerce',
        localProduct: savedProduct,
        wooProduct: wooResult.data
      });
    } catch (wooErr) {
      return res.status(201).json({
        message: 'Product created locally but failed to sync with WooCommerce',
        localProduct: savedProduct,
        wooSkipped: false,
        wooError: formatWooError(wooErr)
      });
    }
  } catch (err) {
    return res.status(500).json({ message: 'Error creating product', error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching products', error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, normalizeProductPayload(req.body), {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return res.status(404).json({ message: 'Product not found' });
    }

    try {
      const wooResult = await updateWooProduct(updated.wooCommerceProductId, updated);
      return res.json({
        message: wooResult.skipped ? 'Product updated locally. WooCommerce sync skipped.' : 'Product updated successfully',
        localProduct: updated,
        wooSkipped: wooResult.skipped,
        wooReason: wooResult.skipped ? wooResult.reason : undefined,
        wooProduct: wooResult.skipped ? undefined : wooResult.data
      });
    } catch (wooErr) {
      return res.json({
        message: 'Product updated locally but failed to sync with WooCommerce',
        localProduct: updated,
        wooSkipped: false,
        wooError: formatWooError(wooErr)
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error updating product', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Product.findById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Product not found' });
    }

    try {
      const wooResult = await deleteWooProduct(deleted.wooCommerceProductId);
      await deleted.deleteOne();

      return res.json({
        message: wooResult.skipped ? 'Product deleted locally. WooCommerce delete skipped.' : 'Product deleted successfully',
        product: deleted,
        wooSkipped: wooResult.skipped,
        wooReason: wooResult.skipped ? wooResult.reason : undefined,
        wooProduct: wooResult.skipped ? undefined : wooResult.data
      });
    } catch (wooErr) {
      return res.status(500).json({
        message: 'Product was not deleted because WooCommerce sync failed',
        product: deleted,
        wooError: formatWooError(wooErr)
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error deleting product', error: err.message });
  }
});

module.exports = router;
