import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

const configuredApiBase = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/$/, '');
const API_BASE = `${configuredApiBase}/api/products`;

const initialFormState = {
  name: '',
  price: '',
  description: '',
  category: '',
  size: '',
  color: '',
  stock: ''
};

function App() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [editingProductId, setEditingProductId] = useState(null);
  const [deletingProductId, setDeletingProductId] = useState(null);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(API_BASE);
      setProducts(res.data);
    } catch (err) {
      setFeedback('Unable to fetch products.');
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(initialFormState);
    setEditingProductId(null);
  };

  const startEdit = (product) => {
    setEditingProductId(product._id);
    setFeedback('');
    setForm({
      name: product.name || '',
      price: String(product.price ?? ''),
      description: product.description || '',
      category: product.category || '',
      size: product.attributes?.size || '',
      color: product.attributes?.color || '',
      stock: String(product.stock ?? '')
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) {
      setFeedback('Name and price are required.');
      return;
    }

    setLoading(true);
    setFeedback('');

    try {
      const payload = {
        name: form.name,
        price: Number(form.price),
        description: form.description,
        category: form.category,
        attributes: { size: form.size, color: form.color },
        stock: Number(form.stock || 0)
      };

      const res = editingProductId
        ? await axios.put(`${API_BASE}/${editingProductId}`, payload)
        : await axios.post(API_BASE, payload);

      setFeedback(res.data?.message || (editingProductId ? 'Product updated.' : 'Product added.'));
      resetForm();
      await fetchProducts();
    } catch (err) {
      console.error(err);
      setFeedback(err.response?.data?.message || (editingProductId ? 'Failed to update product.' : 'Failed to add product.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId) => {
    setDeletingProductId(productId);
    setFeedback('');

    try {
      const res = await axios.delete(`${API_BASE}/${productId}`);
      setFeedback(res.data?.message || 'Product deleted.');

      if (editingProductId === productId) {
        resetForm();
      }

      await fetchProducts();
    } catch (err) {
      console.error(err);
      setFeedback(err.response?.data?.message || 'Failed to delete product.');
    } finally {
      setDeletingProductId(null);
    }
  };

  const inventoryValue = products.reduce((total, product) => total + Number(product.price || 0) * Number(product.stock || 0), 0);
  const lowStockCount = products.filter((product) => Number(product.stock || 0) > 0 && Number(product.stock || 0) <= 5).length;
  const categoryCount = new Set(products.map((product) => product.category).filter(Boolean)).size;

  return (
    <div className="app-shell">
      <div className="app-background" />

      <main className="container">
        <section className="hero card">
          <div className="hero-copy">
            <p className="eyebrow">Product Information Management</p>
            <h1>Manage catalog data with a cleaner, faster workflow.</h1>
            <p className="hero-text">
              Create products, review stock levels, and keep your WooCommerce sync pipeline organized from one
              streamlined workspace.
            </p>

            <div className="hero-metrics">
              <div className="metric">
                <span className="metric-value">{products.length}</span>
                <span className="metric-label">Products tracked</span>
              </div>
              <div className="metric">
                <span className="metric-value">{categoryCount}</span>
                <span className="metric-label">Categories</span>
              </div>
              <div className="metric">
                <span className="metric-value">{lowStockCount}</span>
                <span className="metric-label">Low stock items</span>
              </div>
            </div>
          </div>

          <aside className="hero-panel">
            <p className="panel-label">Inventory snapshot</p>
            <p className="panel-value">${inventoryValue.toFixed(2)}</p>
            <p className="panel-text">Estimated on-hand inventory value based on current product price and stock.</p>
          </aside>
        </section>

        <section className="content-grid">
          <div className="card form-card">
            <div className="section-heading">
              <div>
                <p className="section-label">Product entry</p>
                <h2>{editingProductId ? 'Edit product' : 'Add a new item'}</h2>
              </div>
              <span className="status-pill">{editingProductId ? 'Edit Mode' : 'Live API'}</span>
            </div>

            <form className="product-form" onSubmit={onSubmit}>
              <div className="field">
                <label htmlFor="name">Product name</label>
                <input id="name" name="name" value={form.name} onChange={onChange} placeholder="Premium Cotton Shirt" />
              </div>

              <div className="form-row">
                <div className="field">
                  <label htmlFor="price">Price</label>
                  <input id="price" name="price" type="number" step="0.01" value={form.price} onChange={onChange} placeholder="49.99" />
                </div>

                <div className="field">
                  <label htmlFor="stock">Stock</label>
                  <input id="stock" name="stock" type="number" value={form.stock} onChange={onChange} placeholder="120" />
                </div>
              </div>

              <div className="field">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  placeholder="Short product summary for internal merchandising and downstream sync."
                />
              </div>

              <div className="field">
                <label htmlFor="category">Category</label>
                <input id="category" name="category" value={form.category} onChange={onChange} placeholder="Apparel" />
              </div>

              <div className="form-row">
                <div className="field">
                  <label htmlFor="size">Size</label>
                  <input id="size" name="size" value={form.size} onChange={onChange} placeholder="M" />
                </div>

                <div className="field">
                  <label htmlFor="color">Color</label>
                  <input id="color" name="color" value={form.color} onChange={onChange} placeholder="Navy" />
                </div>
              </div>

              <div className="action-row">
                <button type="submit" disabled={loading}>
                  {loading ? (editingProductId ? 'Saving changes...' : 'Saving product...') : editingProductId ? 'Save Changes' : 'Create Product'}
                </button>
                {editingProductId && (
                  <button className="secondary-button" type="button" onClick={resetForm} disabled={loading}>
                    Cancel Edit
                  </button>
                )}
              </div>

              {feedback && <p className="feedback">{feedback}</p>}
            </form>
          </div>

          <div className="card list-card">
            <div className="section-heading">
              <div>
                <p className="section-label">Catalog overview</p>
                <h2>Current products</h2>
              </div>
              <span className="catalog-count">{products.length} items</span>
            </div>

            {products.length === 0 ? (
              <div className="empty-state">
                <h3>No products yet</h3>
                <p>Add your first product to start building the catalog and testing the sync workflow.</p>
              </div>
            ) : (
              <div className="product-list">
                {products.map((product) => (
                  <article className="product-card" key={product._id}>
                    <div className="product-topline">
                      <div>
                        <h3>{product.name}</h3>
                        <p className="product-description">{product.description || 'No description provided.'}</p>
                      </div>
                      <div className="price-badge">${Number(product.price).toFixed(2)}</div>
                    </div>

                    <div className="product-meta">
                      <span>{product.category || 'Uncategorized'}</span>
                      <span>Stock: {product.stock}</span>
                      <span>Size: {product.attributes?.size || '-'}</span>
                      <span>Color: {product.attributes?.color || '-'}</span>
                    </div>

                    <div className="product-actions">
                      <button className="secondary-button" type="button" onClick={() => startEdit(product)} disabled={loading || deletingProductId === product._id}>
                        Edit
                      </button>
                      <button className="danger-button" type="button" onClick={() => handleDelete(product._id)} disabled={deletingProductId === product._id || loading}>
                        {deletingProductId === product._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>

                    <p className="muted">Added {new Date(product.createdAt).toLocaleString()}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
