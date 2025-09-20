import React, { useState } from 'react';

interface CartItem {
  id: string;
  product: {
    id: number;
    documentId: string;
    name: string;
    price: number;
    image: string;
  };
  variant: { Size: string } | null;
  quantity: number;
  price: number;
}

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  totalPrice: number;
}

interface CustomerInfo {
  email: string;
  name: string;
  phone: string;
  address: string;
  deliveryMethod: 'pickup' | 'delivery';
}

const Cart: React.FC<CartProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  totalPrice
}) => {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    email: '',
    name: '',
    phone: '',
    address: '',
    deliveryMethod: 'pickup'
  });
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const formatPrice = (price: number) => {
    return `GH₵${price.toFixed(2)}`;
  };

  const handleProceedToCheckout = () => {
    setShowCustomerForm(true);
  };

  const handlePayment = async () => {
    if (!customerInfo.email || !customerInfo.name || !customerInfo.phone) {
      alert('Please fill in all required fields');
      return;
    }

    if (customerInfo.deliveryMethod === 'delivery' && !customerInfo.address) {
      alert('Please provide a delivery address');
      return;
    }

    setIsProcessing(true);

    try {
      // Call your backend to initialize Paystack transaction
      const response = await fetch('http://localhost:5000/api/paystack/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: customerInfo.email,
          amount: totalPrice,
          metadata: {
            items: items.map(item => ({
              id: item.product.id,
              documentId: item.product.documentId,
              name: item.product.name,
              variant: item.variant?.Size || null,
              quantity: item.quantity,
              price: item.price
            })),
            customer_name: customerInfo.name,
            customer_phone: customerInfo.phone,
            delivery_address: customerInfo.deliveryMethod === 'delivery' ? customerInfo.address : null,
            delivery_method: customerInfo.deliveryMethod
          }
        })
      });

      const data = await response.json();

      if (data.status && data.data.authorization_url) {
        // Redirect to Paystack payment page
        window.location.href = data.data.authorization_url;
      } else {
        alert('Failed to initialize payment. Please try again.');
        console.error('Payment initialization failed:', data);
      }
    } catch (error) {
      console.error('Error initializing payment:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackToCart = () => {
    setShowCustomerForm(false);
    setCustomerInfo({
      email: '',
      name: '',
      phone: '',
      address: '',
      deliveryMethod: 'pickup'
    });
  };

  return (
    <div className="cart-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000
    }} onClick={onClose}>
      <div className="cart-sidebar" style={{
        position: 'fixed',
        right: 0,
        top: 0,
        height: '100%',
        width: '400px',
        backgroundColor: 'white',
        boxShadow: '-2px 0 5px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '90%'
      }} onClick={(e) => e.stopPropagation()}>
        <div className="cart-header" style={{
          padding: '20px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0 }}>{showCustomerForm ? 'Checkout' : 'Shopping Cart'}</h2>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer'
          }}>×</button>
        </div>

        <div className="cart-content" style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px'
        }}>
          {!showCustomerForm ? (
            // Cart Items View
            items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p>Your cart is empty</p>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {items.map((item) => (
                    <div key={item.id} style={{
                      display: 'flex',
                      gap: '15px',
                      marginBottom: '20px',
                      paddingBottom: '20px',
                      borderBottom: '1px solid #eee'
                    }}>
                      <img 
                        src={item.product.image} 
                        alt={item.product.name}
                        style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                      />
                      
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>{item.product.name}</h3>
                        {item.variant && (
                          <p style={{ margin: '5px 0', color: '#666' }}>Size: {item.variant.Size}</p>
                        )}
                        <p style={{ margin: '5px 0' }}>{formatPrice(item.price)}</p>
                        
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button
                              onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                              style={{
                                width: '30px',
                                height: '30px',
                                border: '1px solid #ddd',
                                background: 'white',
                                cursor: 'pointer'
                              }}
                            >
                              -
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                              style={{
                                width: '30px',
                                height: '30px',
                                border: '1px solid #ddd',
                                background: 'white',
                                cursor: 'pointer'
                              }}
                            >
                              +
                            </button>
                          </div>
                          
                          <button
                            onClick={() => onRemoveItem(item.id)}
                            style={{
                              padding: '5px 10px',
                              background: 'none',
                              border: '1px solid #ff4444',
                              color: '#ff4444',
                              cursor: 'pointer'
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      
                      <div style={{ fontWeight: 'bold' }}>
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #eee' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>
                    Total: {formatPrice(totalPrice)}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={onClearCart} style={{
                      flex: 1,
                      padding: '12px',
                      background: '#f0f0f0',
                      border: 'none',
                      cursor: 'pointer'
                    }}>
                      Clear Cart
                    </button>
                    <button onClick={handleProceedToCheckout} style={{
                      flex: 1,
                      padding: '12px',
                      background: '#000',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer'
                    }}>
                      Proceed to Checkout
                    </button>
                  </div>
                </div>
              </>
            )
          ) : (
            // Customer Information Form
            <div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                  placeholder="your@email.com"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  placeholder="John Doe"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  placeholder="+233 XX XXX XXXX"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Delivery Method *
                </label>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      value="pickup"
                      checked={customerInfo.deliveryMethod === 'pickup'}
                      onChange={() => setCustomerInfo({ ...customerInfo, deliveryMethod: 'pickup' })}
                    />
                    <span>Pickup</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      value="delivery"
                      checked={customerInfo.deliveryMethod === 'delivery'}
                      onChange={() => setCustomerInfo({ ...customerInfo, deliveryMethod: 'delivery' })}
                    />
                    <span>Delivery</span>
                  </label>
                </div>
              </div>

              {customerInfo.deliveryMethod === 'delivery' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Delivery Address *
                  </label>
                  <textarea
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                    placeholder="Enter your delivery address"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      resize: 'vertical'
                    }}
                  />
                </div>
              )}

              <div style={{
                background: '#f5f5f5',
                padding: '15px',
                borderRadius: '8px',
                margin: '20px 0'
              }}>
                <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Order Summary</h3>
                {items.map(item => (
                  <div key={item.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    fontSize: '14px'
                  }}>
                    <span>{item.product.name} {item.variant && `(${item.variant.Size})`} x {item.quantity}</span>
                    <span>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid #ddd',
                  paddingTop: '10px',
                  marginTop: '10px',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}>
                  <span>Total:</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={handleBackToCart}
                  disabled={isProcessing}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#f0f0f0',
                    color: '#333',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    opacity: isProcessing ? 0.5 : 1
                  }}
                >
                  Back to Cart
                </button>
                <button 
                  onClick={handlePayment}
                  disabled={isProcessing}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#000',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    opacity: isProcessing ? 0.5 : 1
                  }}
                >
                  {isProcessing ? 'Processing...' : `Pay ${formatPrice(totalPrice)}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cart;