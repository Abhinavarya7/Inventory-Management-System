import { useEffect, useMemo, useState } from "react";
import KpiCard from "./components/KpiCard";
import Panel from "./components/Panel";
import StatusPill from "./components/StatusPill";
import { api } from "./lib/api";
import { formatCurrency } from "./lib/format";

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

const emptyLineItem = () => ({ product_id: "", quantity: 1 });

function orderTone(status) {
  return status === "cancelled" ? "muted" : "success";
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
  const [productDraft, setProductDraft] = useState(emptyProduct);
  const [customerDraft, setCustomerDraft] = useState(emptyCustomer);
  const [orderDraft, setOrderDraft] = useState({
    customer_id: "",
    items: [emptyLineItem()],
  });
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadWorkspace(preferredOrderId = null) {
    setLoading(true);
    try {
      const [dashboard, nextProducts, nextCustomers, nextOrders] = await Promise.all([
        api.getDashboard(),
        api.listProducts(),
        api.listCustomers(),
        api.listOrders(),
      ]);

      setSummary(dashboard);
      setProducts(nextProducts);
      setCustomers(nextCustomers);
      setOrders(nextOrders);
      setSelectedOrderId((current) => {
        const desired = preferredOrderId ?? current;
        if (desired && nextOrders.some((order) => order.id === desired)) {
          return desired;
        }
        return nextOrders[0]?.id ?? null;
      });
    } catch (err) {
      setError(err.message || "Unable to load the workspace");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWorkspace();
  }, []);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) || null,
    [orders, selectedOrderId],
  );

  const lowStockCount = summary.low_stock_products.length;
  const lineItemPreviewTotal = useMemo(() => {
    return orderDraft.items.reduce((total, item) => {
      const product = products.find((entry) => entry.id === Number(item.product_id));
      if (!product) return total;
      return total + Number(product.price) * Number(item.quantity || 0);
    }, 0);
  }, [orderDraft.items, products]);

  async function runMutation(action, successMessage, preferredOrderId = null) {
    setError("");
    setNotice("");
    try {
      const result = await action();
      await loadWorkspace(preferredOrderId);
      setNotice(successMessage);
      return result;
    } catch (err) {
      setError(err.message || "Something went wrong");
      return null;
    }
  }

  function editProduct(product) {
    setProductDraft({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: String(product.price),
      quantity_in_stock: String(product.quantity_in_stock),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetProductDraft() {
    setProductDraft(emptyProduct);
  }

  function updateLineItem(index, field, value) {
    setOrderDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  }

  function appendLineItem() {
    setOrderDraft((current) => ({
      ...current,
      items: [...current.items, emptyLineItem()],
    }));
  }

  function removeLineItem(index) {
    setOrderDraft((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function submitProduct(event) {
    event.preventDefault();

    const payload = {
      name: productDraft.name.trim(),
      sku: productDraft.sku.trim(),
      price: Number(productDraft.price),
      quantity_in_stock: Number(productDraft.quantity_in_stock),
    };

    await runMutation(
      () =>
        productDraft.id
          ? api.updateProduct(productDraft.id, payload)
          : api.createProduct(payload),
      productDraft.id ? "Product updated." : "Product added.",
    );

    setProductDraft(emptyProduct);
  }

  async function submitCustomer(event) {
    event.preventDefault();

    await runMutation(
      () =>
        api.createCustomer({
          full_name: customerDraft.full_name.trim(),
          email: customerDraft.email.trim(),
          phone_number: customerDraft.phone_number.trim(),
        }),
      "Customer added.",
    );

    setCustomerDraft(emptyCustomer);
  }

  async function submitOrder(event) {
    event.preventDefault();

    const items = orderDraft.items
      .filter((item) => item.product_id)
      .map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
      }));

    const createdOrder = await runMutation(
      () =>
        api.createOrder({
          customer_id: Number(orderDraft.customer_id),
          items,
        }),
      "Order created.",
    );

    if (createdOrder) {
      setSelectedOrderId(createdOrder.id);
      setOrderDraft({
        customer_id: "",
        items: [emptyLineItem()],
      });
    }
  }

  return (
    <div className="dashboard-shell">
      <aside className="rail">
        <div className="brand-block">
          <p className="brand-mark">Inventory Management App</p>
          <h1>Manage the Inventory</h1>
          <p className="brand-copy">
            Track products, customers, and orders.
          </p>
        </div>

        <div className="rail-stack">
          <KpiCard
            label="Products"
            value={summary.total_products}
            caption="Catalog items currently active"
          />
          <KpiCard
            label="Customers"
            value={summary.total_customers}
            caption="Saved customer profiles"
          />
          <KpiCard
            label="Orders"
            value={summary.total_orders}
            caption="Placed"
          />
          <KpiCard
            label="Low stock"
            value={lowStockCount}
            tone="accent"
            caption={`Alert threshold: ${summary.low_stock_threshold}`}
          />
        </div>
      </aside>

      <main className="workspace">
        <header className="hero-card">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h2>Manage products, orders and inventory</h2>
            <p className="hero-copy">
              Inventory Management System
            </p>
          </div>
          <div className="hero-meta">
            <div>
              <span>Low stock rule</span>
              <strong>{summary.low_stock_threshold}</strong>
            </div>
          </div>
        </header>

        {notice ? <div className="banner success">{notice}</div> : null}
        {error ? <div className="banner error">{error}</div> : null}

        <section className="content-grid">
          <Panel
            eyebrow="Stock alerts"
            title="Low inventory needs attention"
            className="span-2"
          >
            {summary.low_stock_products.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.low_stock_products.map((product) => (
                      <tr key={product.id}>
                        <td>{product.name}</td>
                        <td>{product.sku}</td>
                        <td>
                          <StatusPill tone="danger">{product.quantity_in_stock}</StatusPill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-state">No products are currently below the low stock threshold.</p>
            )}
          </Panel>

          <Panel
            eyebrow="Products"
            title={productDraft.id ? "Edit product" : "Add product"}
            actions={
              productDraft.id ? (
                <button className="ghost-button" type="button" onClick={resetProductDraft}>
                  Cancel edit
                </button>
              ) : null
            }
          >
            <form className="form-grid" onSubmit={submitProduct}>
              <label>
                <span>Product name</span>
                <input
                  value={productDraft.name}
                  onChange={(event) => setProductDraft({ ...productDraft, name: event.target.value })}
                  placeholder="Smart Watch"
                  required
                />
              </label>
              <label>
                <span>SKU code</span>
                <input
                  value={productDraft.sku}
                  onChange={(event) => setProductDraft({ ...productDraft, sku: event.target.value })}
                  placeholder="RX-1691"
                  required
                />
              </label>
              <label>
                <span>Price</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={productDraft.price}
                  onChange={(event) => setProductDraft({ ...productDraft, price: event.target.value })}
                  placeholder="30"
                  required
                />
              </label>
              <label>
                <span>Stock on hand</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={productDraft.quantity_in_stock}
                  onChange={(event) =>
                    setProductDraft({ ...productDraft, quantity_in_stock: event.target.value })
                  }
                  placeholder="100"
                  required
                />
              </label>
              <button className="primary-button" type="submit">
                {productDraft.id ? "Save changes" : "Add product"}
              </button>
            </form>

            <div className="table-wrap table-space">
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
                        <StatusPill tone={product.quantity_in_stock <= summary.low_stock_threshold ? "danger" : "default"}>
                          {product.quantity_in_stock}
                        </StatusPill>
                      </td>
                      <td className="actions-cell">
                        <button className="text-button" type="button" onClick={() => editProduct(product)}>
                          Edit
                        </button>
                        <button
                          className="text-button danger"
                          type="button"
                          onClick={() =>
                            runMutation(() => api.deleteProduct(product.id), "Product deleted.")
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
          </Panel>

          <Panel eyebrow="Customers" title="Add customer">
            <form className="form-grid" onSubmit={submitCustomer}>
              <label>
                <span>Full name</span>
                <input
                  value={customerDraft.full_name}
                  onChange={(event) => setCustomerDraft({ ...customerDraft, full_name: event.target.value })}
                  placeholder="Abhinav Arya"
                  required
                />
              </label>
              <label>
                <span>Email address</span>
                <input
                  type="email"
                  value={customerDraft.email}
                  onChange={(event) => setCustomerDraft({ ...customerDraft, email: event.target.value })}
                  placeholder="abhinav@iitmandi.com"
                  required
                />
              </label>
              <label>
                <span>Phone number</span>
                <input
                  value={customerDraft.phone_number}
                  onChange={(event) => setCustomerDraft({ ...customerDraft, phone_number: event.target.value })}
                  placeholder="9193778948"
                  required
                />
              </label>
              <button className="primary-button" type="submit">
                Add customer
              </button>
            </form>

            <div className="table-wrap table-space">
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
                            runMutation(() => api.deleteCustomer(customer.id), "Customer deleted.")
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
          </Panel>

          <Panel
            eyebrow="Orders"
            title="Create order"
            className="span-2"
            actions={<div className="total-chip">{formatCurrency(lineItemPreviewTotal)}</div>}
          >
            <form className="form-grid order-form" onSubmit={submitOrder}>
              <label>
                <span>Customer</span>
                <select
                  value={orderDraft.customer_id}
                  onChange={(event) => setOrderDraft({ ...orderDraft, customer_id: event.target.value })}
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

              <div className="order-lines">
                {orderDraft.items.map((item, index) => (
                  <div key={index} className="order-line">
                    <label>
                      <span>Product</span>
                      <select
                        value={item.product_id}
                        onChange={(event) => updateLineItem(index, "product_id", event.target.value)}
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
                        onChange={(event) => updateLineItem(index, "quantity", event.target.value)}
                        required
                      />
                    </label>
                    <button
                      className="text-button danger remove-line"
                      type="button"
                      onClick={() => removeLineItem(index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="order-actions">
                <button className="ghost-button" type="button" onClick={appendLineItem}>
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
                      <tr key={order.id} className={order.id === selectedOrderId ? "active-row" : ""}>
                        <td>#{order.id}</td>
                        <td>{order.customer.full_name}</td>
                        <td>
                          <StatusPill tone={orderTone(order.status)}>{order.status}</StatusPill>
                        </td>
                        <td>{formatCurrency(order.total_amount)}</td>
                        <td className="actions-cell">
                          <button className="text-button" type="button" onClick={() => setSelectedOrderId(order.id)}>
                            View
                          </button>
                          <button
                            className="text-button danger"
                            type="button"
                            disabled={order.status === "cancelled"}
                            onClick={() =>
                              runMutation(
                                () => api.cancelOrder(order.id),
                                "Order cancelled and inventory restored.",
                                order.id,
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

              <aside className="detail-card">
                <p className="eyebrow">Selected order</p>
                {selectedOrder ? (
                  <>
                    <h3>#{selectedOrder.id}</h3>
                    <div className="detail-group">
                      <span>Customer</span>
                      <strong>{selectedOrder.customer.full_name}</strong>
                      <small>{selectedOrder.customer.email}</small>
                    </div>
                    <div className="detail-group">
                      <span>Status</span>
                      <strong>{selectedOrder.status}</strong>
                    </div>
                    <div className="detail-group">
                      <span>Total</span>
                      <strong>{formatCurrency(selectedOrder.total_amount)}</strong>
                    </div>
                    <div className="detail-group">
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
                  <p className="empty-state">Choose an order to inspect its line items and totals.</p>
                )}
              </aside>
            </div>
          </Panel>
        </section>
      </main>
    </div>
  );
}

