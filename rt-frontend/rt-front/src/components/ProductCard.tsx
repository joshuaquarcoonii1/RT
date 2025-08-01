import React from 'react';

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

interface StrapiVariant {
  id: number;
  Size: string;
  Override: number | null;
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

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
  onAddToCart: (product: Product, variant?: StrapiVariant | null, quantity?: number) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, onAddToCart }) => {
  const formatPrice = (price: number) => {
    return `GH₵${price.toFixed(2)}`;
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    
    // If product has variants, add the first variant, otherwise add without variant
    const defaultVariant = product.variants.length > 0 ? product.variants[0] : null;
    onAddToCart(product, defaultVariant, 1);
  };

  const handleCardClick = () => {
    onClick(product);
  };

  return (
    <>
      <style>{`
        .product-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          cursor: pointer;
          position: relative;
          width: 250px; /* Fixed width */
          margin: 0 auto; /* Center the card */
        }

        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .product-image-container {
          position: relative;
          aspect-ratio: 1/1; /* Make it square */
          overflow: hidden;
        }

        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .product-card:hover .product-image {
          transform: scale(1.05);
        }

        .stock-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 18px;
        }

        .product-info {
          padding: 12px;
        }

        .product-name {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 4px 0;
          color: #1a1a1a;
          line-height: 1.2;
          height: 2.4em;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .product-price {
          font-size: 16px;
          font-weight: 700;
          color: #007bff;
          margin: 0 0 8px 0;
        }

        .product-variants {
          margin: 0 0 16px 0;
          font-size: 14px;
          color: #666;
        }

        .variants-label {
          font-weight: 500;
        }

        .variant-size {
          font-weight: 400;
        }

        .add-to-cart-btn {
          width: 100%;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .add-to-cart-btn:hover:not(.disabled) {
          background: #0056b3;
        }

        .add-to-cart-btn.disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .add-to-cart-btn:active {
          transform: translateY(1px);
        }

        @media (max-width: 768px) {
          .product-info {
            padding: 16px;
          }

          .product-name {
            font-size: 16px;
          }

          .product-price {
            font-size: 18px;
          }
        }
      `}</style>
      
      <div className="product-card" onClick={handleCardClick}>
        <div className="product-image-container">
          <img 
            src={product.image} 
            alt={product.name}
            className="product-image"
            loading="lazy"
          />
          {!product.stock && (
            <div className="stock-overlay">
              <span>Out of Stock</span>
            </div>
          )}
        </div>
        
        <div className="product-info">
          <h3 className="product-name">{product.name}</h3>
          <p className="product-price">{formatPrice(product.price)}</p>
          
          {product.variants.length > 0 && (
            <div className="product-variants">
              <span className="variants-label">Sizes: </span>
              {product.variants.map((variant, index) => (
                <span key={variant.id} className="variant-size">
                  {variant.Size}{index < product.variants.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
          )}
          
          <button 
            className={`add-to-cart-btn ${!product.stock ? 'disabled' : ''}`}
            onClick={handleAddToCart}
            disabled={!product.stock}
          >
            {product.stock ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>
    </>
  );
};

export default ProductCard;