import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api";

const emptyProduct = {
  id: null,
  name: "",
  sku: "",
  price: "",
  quantity_in_stock: "",
};

const emptyCustomer = {
  full_name: "",
  email: "",
  phone_number: "",
};

const emptyOrderItem = () => ({ product_id: "", quantity: 1 });

function formatCurrency(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(number);
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({
    total_products: 0,
    total_customers: 0,
    total_orders: 0,
    low_stock_threshold: 10,
    low_stock_products: [],
  });
  const [productForm, setProductForm] = useState(emptyProduct);
  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [orderForm, setOrderForm] = useState({
    customer_id: "",
    items: [emptyOrderItem()],
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [dashboard, productList, customerList, orderList] = await Promise.all([
        api.getDashboard(),
        api.listProducts(),
        api.listCustomers(),
        api.listOrders(),
      ]);
      setSummary(dashboard);
      setProducts(productList);
      setCustomers(customerList);
      setOrders(orderList);
      if (selectedOrder) {
        const refreshedSelection = orderList.find((order) => order.id === selectedOrder.id);
        setSelectedOrder(refreshedSelection || orderList[0] || null);
      } else if (orderList.length > 0) {
        setSelectedOrder(orderList[0]);
      }
    } catch (err) {
      setError(err.message || "Unable to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function runAction(action, successMessage, onSuccess) {
    setError("");
    setMessage("");
    try {
      const result = await action();
      setMessage(successMessage);
      await loadAll();
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
  }

  function startEditProduct(product) {
    setProductForm({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: String(product.price),
      quantity_in_stock: String(product.quantity_in_stock),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetProductForm() {
    setProductForm(emptyProduct);
  }

  function updateOrderItem(index, field, value) {
    setOrderForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  }

  function addOrderItem() {
    setOrderForm((current) => ({
      ...current,
      items: [...current.items, emptyOrderItem()],
    }));
  }

  function removeOrderItem(index) {
    setOrderForm((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  const lowStockCount = summary.low_stock_products.length;
  const orderPreviewTotal = useMemo(() => {
    return orderForm.items.reduce((total, item) => {
      const product = products.find((entry) => entry.id === Number(item.product_id));
      if (!product) {
        return total;
      }
      return total + Number(product.price) * Number(item.quantity || 0);
    }, 0);
  }, [orderForm.items, products]);

  async function submitProduct(event) {
    event.preventDefault();
    const payload = {
      name: productForm.name.trim(),
      sku: productForm.sku.trim(),
      price: Number(productForm.price),
      quantity_in_stock: Number(productForm.quantity_in_stock),
    };

    await runAction(
      async () => {
        if (productForm.id) {
          await api.updateProduct(productForm.id, payload);
        } else {
          await api.createProduct(payload);
        }
        resetProductForm();
      },
      productForm.id ? "Product updated successfully." : "Product created successfully.",
    );
  }

  async function submitCustomer(event) {
    event.preventDefault();
    await runAction(async () => {
      await api.createCustomer({
        full_name: customerForm.full_name.trim(),
        email: customerForm.email.trim(),
        phone_number: customerForm.phone_number.trim(),
      });
      setCustomerForm(emptyCustomer);
    }, "Customer created successfully.");
  }

  async function submitOrder(event) {
    event.preventDefault();
    const items = orderForm.items
      .filter((item) => item.product_id)
      .map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
      }));

    await runAction(
      async () => {
        const createdOrder = await api.createOrder({
          customer_id: Number(orderForm.customer_id),
          items,
        });
        setOrderForm({
          customer_id: "",
          items: [emptyOrderItem()],
        });
        return createdOrder;
      },
      "Order created successfully.",
      (createdOrder) => setSelectedOrder(createdOrder),
    );
  }

  return (
    <div className="app-shell">
      <div className="background-orb background-orb-left" />
      <div className="background-orb background-orb-right" />

      <main className="app-container">
        <header className="hero">
          <div>
            <p className="eyebrow">Inventory & Order Management</p>
            <h1>Run products, customers, and orders from one clean dashboard.</h1>
            <p className="hero-copy">
              Track stock, create orders, and keep customer records in sync with the backend API.
            </p>
          </div>
          <div className="hero-badge">
            <span>API-connected</span>
            <strong>{loading ? "Syncing..." : "Live data ready"}</strong>
          </div>
        </header>

        <section className="summary-grid">
          <article className="summary-card">
            <span>Total Products</span>
            <strong>{summary.total_products}</strong>
          </article>
          <article className="summary-card">
            <span>Total Customers</span>
            <strong>{summary.total_customers}</strong>
          </article>
          <article className="summary-card">
            <span>Total Orders</span>
            <strong>{summary.total_orders}</strong>
          </article>
          <article className="summary-card accent">
            <span>Low Stock Products</span>
            <strong>{lowStockCount}</strong>
          </article>
        </section>

        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert error">{error}</div> : null}

        <section className="dashboard-grid">
          <div className="panel panel-wide">
            <div className="panel-header">
              <div>
                <p className="section-label">Dashboard</p>
                <h2>Low stock alerts</h2>
              </div>
              <span className="threshold-pill">Threshold: {summary.low_stock_threshold}</span>
            </div>
            {summary.low_stock_products.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.low_stock_products.map((product) => (
                      <tr key={product.id}>
                        <td>{product.name}</td>
                        <td>{product.sku}</td>
                        <td>
                          <span className="status-pill danger">{product.quantity_in_stock}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-state">No low stock items right now.</p>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Products</p>
                <h2>{productForm.id ? "Update product" : "Add product"}</h2>
              </div>
              {productForm.id ? (
                <button className="ghost-button" type="button" onClick={resetProductForm}>
                  Cancel edit
                </button>
              ) : null}
            </div>
            <form className="form-grid" onSubmit={submitProduct}>
              <label>
                <span>Product name</span>
                <input
                  value={productForm.name}
                  onChange={(event) => setProductForm({ ...productForm, name: event.target.value })}
                  placeholder="Wireless Mouse"
                  required
                />
              </label>
              <label>
                <span>SKU / code</span>
                <input
                  value={productForm.sku}
                  onChange={(event) => setProductForm({ ...productForm, sku: event.target.value })}
                  placeholder="WM-1001"
                  required
                />
              </label>
              <label>
                <span>Price</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={productForm.price}
                  onChange={(event) => setProductForm({ ...productForm, price: event.target.value })}
                  placeholder="49.99"
                  required
                />
              </label>
              <label>
                <span>Quantity in stock</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={productForm.quantity_in_stock}
                  onChange={(event) =>
                    setProductForm({ ...productForm, quantity_in_stock: event.target.value })
                  }
                  placeholder="100"
                  required
                />
              </label>
              <button className="primary-button" type="submit">
                {productForm.id ? "Update product" : "Add product"}
              </button>
            </form>

            <div className="table-wrap compact-top">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>SKU</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{product.sku}</td>
                      <td>{formatCurrency(product.price)}</td>
                      <td>
                        <span className={product.quantity_in_stock <= summary.low_stock_threshold ? "status-pill danger" : "status-pill"}>
                          {product.quantity_in_stock}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button className="text-button" type="button" onClick={() => startEditProduct(product)}>
                          Edit
                        </button>
                        <button
                          className="text-button danger"
                          type="button"
                          onClick={() =>
                            runAction(
                              () => api.deleteProduct(product.id),
                              "Product deleted successfully.",
                            )
                          }
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Customers</p>
                <h2>Add customer</h2>
              </div>
            </div>
            <form className="form-grid" onSubmit={submitCustomer}>
              <label>
                <span>Full name</span>
                <input
                  value={customerForm.full_name}
                  onChange={(event) => setCustomerForm({ ...customerForm, full_name: event.target.value })}
                  placeholder="Jane Doe"
                  required
                />
              </label>
              <label>
                <span>Email address</span>
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={(event) => setCustomerForm({ ...customerForm, email: event.target.value })}
                  placeholder="jane@company.com"
                  required
                />
              </label>
              <label>
                <span>Phone number</span>
                <input
                  value={customerForm.phone_number}
                  onChange={(event) => setCustomerForm({ ...customerForm, phone_number: event.target.value })}
                  placeholder="+1 555 0100"
                  required
                />
              </label>
              <button className="primary-button" type="submit">
                Add customer
              </button>
            </form>

            <div className="table-wrap compact-top">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td>{customer.full_name}</td>
                      <td>{customer.email}</td>
                      <td>{customer.phone_number}</td>
                      <td className="actions-cell">
                        <button
                          className="text-button danger"
                          type="button"
                          onClick={() =>
                            runAction(
                              () => api.deleteCustomer(customer.id),
                              "Customer deleted successfully.",
                            )
                          }
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel panel-wide">
            <div className="panel-header">
              <div>
                <p className="section-label">Orders</p>
                <h2>Create order</h2>
              </div>
              <div className="total-preview">{formatCurrency(orderPreviewTotal)}</div>
            </div>

            <form className="form-grid order-form" onSubmit={submitOrder}>
              <label>
                <span>Customer</span>
                <select
                  value={orderForm.customer_id}
                  onChange={(event) => setOrderForm({ ...orderForm, customer_id: event.target.value })}
                  required
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.full_name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="order-items">
                {orderForm.items.map((item, index) => (
                  <div key={index} className="order-item-row">
                    <label>
                      <span>Product</span>
                      <select
                        value={item.product_id}
                        onChange={(event) => updateOrderItem(index, "product_id", event.target.value)}
                        required
                      >
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.sku}) - {product.quantity_in_stock} in stock
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Quantity</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(event) => updateOrderItem(index, "quantity", event.target.value)}
                        required
                      />
                    </label>
                    <button
                      className="text-button danger remove-line"
                      type="button"
                      onClick={() => removeOrderItem(index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="order-actions">
                <button className="ghost-button" type="button" onClick={addOrderItem}>
                  Add another item
                </button>
                <button className="primary-button" type="submit">
                  Create order
                </button>
              </div>
            </form>

            <div className="orders-layout">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td>#{order.id}</td>
                        <td>{order.customer.full_name}</td>
                        <td>
                          <span className={order.status === "cancelled" ? "status-pill muted" : "status-pill success"}>
                            {order.status}
                          </span>
                        </td>
                        <td>{formatCurrency(order.total_amount)}</td>
                        <td className="actions-cell">
                          <button className="text-button" type="button" onClick={() => setSelectedOrder(order)}>
                            View details
                          </button>
                          <button
                            className="text-button danger"
                            type="button"
                            disabled={order.status === "cancelled"}
                            onClick={() =>
                              runAction(
                                () => api.cancelOrder(order.id),
                                "Order cancelled and inventory restored.",
                              )
                            }
                          >
                            {order.status === "cancelled" ? "Cancelled" : "Cancel"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <aside className="order-details">
                <div className="panel-header compact">
                  <div>
                    <p className="section-label">Selected order</p>
                    <h2>{selectedOrder ? `#${selectedOrder.id}` : "Order details"}</h2>
                  </div>
                </div>

                {selectedOrder ? (
                  <>
                    <div className="detail-card">
                      <span>Customer</span>
                      <strong>{selectedOrder.customer.full_name}</strong>
                      <p>{selectedOrder.customer.email}</p>
                    </div>
                    <div className="detail-card">
                      <span>Status</span>
                      <strong>{selectedOrder.status}</strong>
                    </div>
                    <div className="detail-card">
                      <span>Total</span>
                      <strong>{formatCurrency(selectedOrder.total_amount)}</strong>
                    </div>
                    <div className="detail-card">
                      <span>Items</span>
                      <ul className="detail-list">
                        {selectedOrder.items.map((item) => (
                          <li key={item.id}>
                            {item.product.name} x {item.quantity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <p className="empty-state">Select an order to inspect its line items.</p>
                )}
              </aside>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
