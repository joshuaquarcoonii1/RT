import React from 'react';
import { usePaystackPayment } from 'react-paystack';
import type { CartItem } from '../App';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  totalPrice: number;
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

  // The configuration for the payment
  const config = {
    reference: (new Date()).getTime().toString(),
    // Using a hardcoded email. All transactions will be recorded with this email.
    // Replace with a valid email address.
    email: "customer@example.com", 
    amount: totalPrice * 100, // Amount in pesewas
    currency: 'GHS', // Explicitly set the currency to Ghanaian Cedis
    publicKey: 'pk_test_52df89bda24937b742986cbefcfd238345489793', // Replace with your public key
  };

  const initializePayment = usePaystackPayment(config);

  if (!isOpen) return null;

  const formatPrice = (price: number) => {
    return `GH₵${price.toFixed(2)}`;
  };

  const onSuccess = (reference: any) => {
    console.log(reference);
    alert('Thanks for doing business with us! Come back soon!!');
    onClearCart();
    onClose();
  };

  const onClosePayment = () => {
    console.log('closed');
  };

  const handleCheckout = () => {
    // The email is now hardcoded, so no need to check for it.
    initializePayment({
      onSuccess,
      onClose: onClosePayment
    });
  };

  return (
    <div className="cart-overlay" onClick={onClose}>
      <div className="cart-sidebar" onClick={(e) => e.stopPropagation()}>
        <div className="cart-header">
          <h2>Shopping Cart</h2>
          <button className="cart-close" onClick={onClose}>×</button>
        </div>

        <div className="cart-content">
          {items.length === 0 ? (
            <div className="cart-empty">
              <p>Your cart is empty</p>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {items.map((item) => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-image">
                      <img src={item.product.image} alt={item.product.name} />
                    </div>
                    
                    <div className="cart-item-details">
                      <h3>{item.product.name}</h3>
                      {item.variant && (
                        <p className="cart-item-variant">Size: {item.variant.Size}</p>
                      )}
                      <p className="cart-item-price">{formatPrice(item.price)}</p>
                      
                      <div className="cart-item-controls">
                        <div className="quantity-controls">
                          <button
                            className="quantity-btn"
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          >
                            -
                          </button>
                          <span className="quantity">{item.quantity}</span>
                          <button
                            className="quantity-btn"
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                        
                        <button
                          className="remove-btn"
                          onClick={() => onRemoveItem(item.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    
                    <div className="cart-item-total">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="cart-footer">
                {/* Email input field has been removed */}
                <div className="cart-total">
                  <strong>Total: {formatPrice(totalPrice)}</strong>
                </div>
                
                <div className="cart-actions">
                  <button className="clear-cart-btn" onClick={onClearCart}>
                    Clear Cart
                  </button>
                  <button className="checkout-btn" onClick={handleCheckout}>
                    Checkout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cart;