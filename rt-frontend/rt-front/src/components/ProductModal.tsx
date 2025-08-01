import React, { useState } from 'react';

interface StrapiVariant {
  id: number;
  Size: string;
  Override: number | null;
}

// Strapi image interface to match App.tsx
interface StrapiImage {
  id: number;
  url: string;
  alternativeText: string | null;
  width: number;
  height: number;
  formats?: {
    thumbnail?: { url: string };
    small?: { url: string };
    medium?: { url: string };
    large?: { url: string };
  };
}

interface Product {
  id: number;
  documentId: string;
  name: string;
  price: number;
  image: string;
  description: string;
  stock: boolean;
  variants: StrapiVariant[];
  slug: string;
  allImages: StrapiImage[];
}

interface ProductModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, variant?: StrapiVariant | null, quantity?: number) => void;
  isOpen: boolean;
  
}

const ProductModal: React.FC<ProductModalProps> = ({ product, onClose, onAddToCart }) => {
  const [selectedVariant, setSelectedVariant] = useState<StrapiVariant | null>(
    product.variants.length > 0 ? product.variants[0] : null
  );
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const formatPrice = (price: number) => {
    return `GH₵${price.toFixed(2)}`;
  };

  const getCurrentPrice = () => {
    return selectedVariant?.Override || product.price;
  };

  const handleAddToCart = () => {
    onAddToCart(product, selectedVariant, quantity);
    // Optionally close modal after adding to cart
    onClose();
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  const handleVariantChange = (variant: StrapiVariant) => {
    setSelectedVariant(variant);
  };

  const images = product.allImages.length > 0 ? product.allImages : [{ url: product.image }];

  return (
    <>
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .modal-close {
          position: absolute;
          top: 15px;
          right: 15px;
          background: rgba(0, 0, 0, 0.1);
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          font-size: 24px;
          cursor: pointer;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }

        .modal-close:hover {
          background: rgba(0, 0, 0, 0.2);
        }

        .modal-body {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          padding: 30px;
        }

        .modal-images {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .main-image {
          aspect-ratio: 1;
          overflow: hidden;
          border-radius: 8px;
          background: #f8f9fa;
        }

        .main-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-thumbnails {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding: 5px 0;
        }

        .thumbnail {
          flex-shrink: 0;
          width: 60px;
          height: 60px;
          border: 2px solid transparent;
          border-radius: 6px;
          overflow: hidden;
          cursor: pointer;
          transition: border-color 0.2s;
          background: none;
          padding: 0;
        }

        .thumbnail.active {
          border-color: #007bff;
        }

        .thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .modal-details {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .modal-details h2 {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
          color: #1a1a1a;
        }

        .modal-price {
          font-size: 24px;
          font-weight: 600;
          color: #007bff;
          margin: 0;
        }

        .original-price {
          font-size: 16px;
          color: #666;
          margin: -10px 0 0 0;
        }

        .crossed-out {
          text-decoration: line-through;
        }

        .modal-description {
          line-height: 1.6;
          color: #4a5568;
        }

        .modal-description p {
          margin: 0;
        }

        .variant-section {
          border-top: 1px solid #e2e8f0;
          padding-top: 20px;
        }

        .variant-section h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 12px 0;
          color: #2d3748;
        }

        .variant-options {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .variant-button {
          padding: 8px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .variant-button:hover {
          border-color: #cbd5e0;
        }

        .variant-button.selected {
          border-color: #007bff;
          background: #007bff;
          color: white;
        }

        .variant-price {
          display: block;
          font-size: 12px;
          font-weight: 400;
          margin-top: 2px;
        }

        .quantity-section {
          border-top: 1px solid #e2e8f0;
          padding-top: 20px;
        }

        .quantity-section h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 12px 0;
          color: #2d3748;
        }

        .quantity-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .quantity-button {
          width: 40px;
          height: 40px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 18px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .quantity-button:hover {
          background: #f7fafc;
          border-color: #cbd5e0;
        }

        .quantity-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .quantity-input {
          width: 60px;
          height: 40px;
          text-align: center;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 500;
        }

        .add-to-cart-button {
          background: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 16px 24px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-top: 10px;
        }

        .add-to-cart-button:hover {
          background: #0056b3;
        }

        .add-to-cart-button:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .stock-status {
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          text-align: center;
        }

        .in-stock {
          background: #d4edda;
          color: #155724;
        }

        .out-of-stock {
          background: #f8d7da;
          color: #721c24;
        }

        @media (max-width: 768px) {
          .modal-body {
            grid-template-columns: 1fr;
            gap: 20px;
            padding: 20px;
          }
          
          .modal-details h2 {
            font-size: 24px;
          }
          
          .modal-price {
            font-size: 20px;
          }

          .modal-content {
            margin: 10px;
            max-height: calc(100vh - 20px);
          }

          .variant-options {
            gap: 6px;
          }

          .variant-button {
            padding: 6px 12px;
            font-size: 13px;
          }

          .quantity-controls {
            justify-content: center;
          }
        }
      `}</style>
      <div className="modal-overlay">
        <div className="modal-content">
          <button className="modal-close" onClick={onClose}>&times;</button>
          
          <div className="modal-body">
            {/* Left side - Images */}
            <div className="modal-images">
              <div className="main-image">
                <img src={images[currentImageIndex].url} alt={product.name} />
              </div>
              
              {images.length > 1 && (
                <div className="image-thumbnails">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      className={`thumbnail ${index === currentImageIndex ? 'active' : ''}`}
                      onClick={() => setCurrentImageIndex(index)}
                    >
                      <img src={image.url} alt={`${product.name} thumbnail ${index + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right side - Product Details */}
            <div className="modal-details">
              <h2>{product.name}</h2>
              
              <div>
                <p className="modal-price">{formatPrice(getCurrentPrice())}</p>
                {selectedVariant?.Override && (
                  <p className="original-price">
                    <span className="crossed-out">{formatPrice(product.price)}</span>
                  </p>
                )}
              </div>

              <div className="modal-description">
                <p>{product.description}</p>
              </div>

              {product.variants.length > 0 && (
                <div className="variant-section">
                  <h3>Size Options</h3>
                  <div className="variant-options">
                    {product.variants.map((variant) => (
                      <button
                        key={variant.id}
                        className={`variant-button ${selectedVariant?.id === variant.id ? 'selected' : ''}`}
                        onClick={() => handleVariantChange(variant)}
                      >
                        {variant.Size}
                        {variant.Override && (
                          <span className="variant-price">{formatPrice(variant.Override)}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="quantity-section">
                <h3>Quantity</h3>
                <div className="quantity-controls">
                  <button 
                    className="quantity-button"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    className="quantity-input"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
                    min="1"
                  />
                  <button 
                    className="quantity-button"
                    onClick={() => handleQuantityChange(quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className={`stock-status ${product.stock ? 'in-stock' : 'out-of-stock'}`}>
                {product.stock ? 'In Stock' : 'Out of Stock'}
              </div>

              <button
                className="add-to-cart-button"
                onClick={handleAddToCart}
                disabled={!product.stock}
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
      </>
    );
  };
  export default ProductModal;