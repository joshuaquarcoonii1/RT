import React, { useState, useEffect } from 'react';
import './App.css';
import ProductCard from './components/ProductCard';
import ProductModal from './components/ProductModal';
import Cart from './components/Cart';
import Footer from './components/Footer';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import MouseOutlinedIcon from '@mui/icons-material/MouseOutlined';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Strapi response interfaces
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

interface StrapiProduct {
  id: number;
  documentId: string;
  Title: string;
  Price: number;
  Stock: boolean;
  Slug: string;
  description: Array<{
    type: string;
    children: Array<{ text: string; type: string }>;
  }>;
  Varients: StrapiVariant[];
  image: StrapiImage[];
}

interface StrapiResponse {
  data: StrapiProduct[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

// Transformed product interface for the app
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

// Cart item interface
export interface CartItem {
  id: string; // Unique identifier for cart item (product.documentId + variant.id)
  product: Product;
  variant: StrapiVariant | null;
  quantity: number;
  price: number; // Final price (with variant override if applicable)
}

const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [WelcomeModalopen, setWelcomeModalopen] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'price-low' | 'price-high'>('name');
  const [filterInStock, setFilterInStock] = useState(false);

  const handleClickAway = () => {
    setIsProductModalOpen(false);
  };

  // Transform Strapi data to app format
  const transformStrapiData = (strapiResponse: StrapiResponse): Product[] => {
    const STRAPI_BASE_URL = 'http://localhost:1337';
    
    return strapiResponse.data.map((item) => {
      // Get the best available image URL
      const primaryImage = item.image?.[0];
      let imageUrl = 'https://via.placeholder.com/300x400?text=No+Image';
      
      if (primaryImage) {
        // Prefer medium format, then small, then original
        if (primaryImage.formats?.medium?.url) {
          imageUrl = `${STRAPI_BASE_URL}${primaryImage.formats.medium.url}`;
        } else if (primaryImage.formats?.small?.url) {
          imageUrl = `${STRAPI_BASE_URL}${primaryImage.formats.small.url}`;
        } else if (primaryImage.url) {
          imageUrl = `${STRAPI_BASE_URL}${primaryImage.url}`;
        }
      }

      return {
        id: item.id,
        documentId: item.documentId,
        name: item.Title,
        price: item.Price,
        image: imageUrl,
        description: item.description?.[0]?.children?.[0]?.text || 'No description available',
        stock: item.Stock,
        variants: item.Varients || [],
        slug: item.Slug,
        allImages: item.image?.map(img => ({
          ...img,
          url: `${STRAPI_BASE_URL}${img.url}`,
          formats: img.formats ? {
            ...img.formats,
            ...(img.formats.thumbnail && { 
              thumbnail: { 
                ...img.formats.thumbnail, 
                url: `${STRAPI_BASE_URL}${img.formats.thumbnail.url}` 
              } 
            }),
            ...(img.formats.small && { 
              small: { 
                ...img.formats.small, 
                url: `${STRAPI_BASE_URL}${img.formats.small.url}` 
              } 
            }),
            ...(img.formats.medium && { 
              medium: { 
                ...img.formats.medium, 
                url: `${STRAPI_BASE_URL}${img.formats.medium.url}` 
              } 
            }),
            ...(img.formats.large && { 
              large: { 
                ...img.formats.large, 
                url: `${STRAPI_BASE_URL}${img.formats.large.url}` 
              } 
            }),
          } : undefined
        })) || []
      };
    });
  };

  // Load products from Strapi API
  // Open welcome modal on component mount
  useEffect(() => {
    setWelcomeModalopen(true);
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('http://localhost:1337/api/galleries?populate=*');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch products (${response.status})`);
        }
        
        const data: StrapiResponse = await response.json();
        
        if (!data.data || data.data.length === 0) {
          setError('No products found');
          setProducts([]);
        } else {
          const transformedProducts = transformStrapiData(data);
          setProducts(transformedProducts);
        }
        
      } catch (err) {
        console.error('Error fetching products:', err);
        setError(err instanceof Error ? err.message : 'Unable to load products');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Filter and sort products
  const getFilteredAndSortedProducts = () => {
    let filtered = filterInStock ? products.filter(p => p.stock) : products;
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });
  };

  // Cart functionality
  const addToCart = (product: Product, variant: StrapiVariant | null = null, quantity: number = 1) => {
    const cartItemId = variant ? `${product.documentId}-${variant.id}` : product.documentId;
    const finalPrice = variant?.Override || product.price;

    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === cartItemId);
      
      if (existingItem) {
        // Update quantity if item already exists
        return prevItems.map(item =>
          item.id === cartItemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Add new item to cart
        const newItem: CartItem = {
          id: cartItemId,
          product,
          variant,
          quantity,
          price: finalPrice
        };
        return [...prevItems, newItem];
      }
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== cartItemId));
  };

  const updateCartItemQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === cartItemId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
  };

  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Loading state
  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="app-container">
        <div className="error-message">
          <h2>Unable to load products</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const filteredProducts = getFilteredAndSortedProducts();

  // Main app render
  return (
    <div className="app-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-content">
          <div className="nav-links">
            <button className="nav-link" onClick={scrollToTop}>Home</button>
            <button className="nav-link" onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}>Products</button>
            <button className="nav-link" onClick={() => document.getElementById('footer')?.scrollIntoView({ behavior: 'smooth' })}>Contact</button>
          </div>
          <button className="cart-button" onClick={toggleCart}>
            <span className="cart-icon">🛒</span>
            {getTotalItems() > 0 && (
              <span className="cart-badge">{getTotalItems()}</span>
            )}
          </button>
        </div>
      </nav>

      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">Collection</h1>
          <p className="app-subtitle">Curated fashion pieces for the modern wardrobe</p>
        </div>
      </header>

      <main className="main-content">
        <div className="products-section" id="products">
          <div className="section-header">
            <div className="section-title-area">
              <h2>Products</h2>
              <p>{filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}</p>
            </div>
            
            {/* Filters and Sort */}
            <div className="filters-controls">
              <div className="filter-group">
                <label className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={filterInStock}
                    onChange={(e) => setFilterInStock(e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  In Stock Only
                </label>
              </div>
              
              <div className="sort-group">
                <label htmlFor="sort-select">Sort by:</label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="sort-select"
                >
                  <option value="name">Name</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.documentId}
                product={product}
                onClick={handleProductClick}
                onAddToCart={addToCart}
              />
            ))}
          </div>

          {filteredProducts.length === 0 && !loading && (
            <div className="no-products">
              <p>No products match your current filters.</p>
              <button 
                className="clear-filters-btn"
                onClick={() => {
                  setSortBy('name');
                  setFilterInStock(false);
                }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </main>

      {selectedProduct && (
        <ClickAwayListener onClickAway={handleClickAway}>
          <ProductModal 
            product={selectedProduct} 
            onClose={handleCloseModal}
            onAddToCart={addToCart}
            isOpen={isProductModalOpen}
          />
        </ClickAwayListener>
      )}

      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateCartItemQuantity}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
        totalPrice={getTotalPrice()}
      />

      <Footer />

      <Modal
        open={WelcomeModalopen}
        onClose={() => setWelcomeModalopen(false)}
        aria-labelledby="welcome-modal-title"
        aria-describedby="welcome-modal-description"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
        }}>
          <h2 id="welcome-modal-title" style={{ marginBottom: '20px', textAlign: 'center' }}>
            How to Shop
          </h2>
          <Timeline position="alternate">
            <TimelineItem>
              <TimelineSeparator>
                <TimelineDot variant="outlined" color="primary">
                  <MouseOutlinedIcon />
                </TimelineDot>
                <TimelineConnector />
              </TimelineSeparator>
              <TimelineContent>Select</TimelineContent>
            </TimelineItem>
            <TimelineItem>
              <TimelineSeparator>
                <TimelineDot variant="outlined" color="secondary">
                  <CheckroomIcon />
                </TimelineDot>
                <TimelineConnector />
              </TimelineSeparator>
              <TimelineContent>Choose size</TimelineContent>
            </TimelineItem>
            <TimelineItem>
              <TimelineSeparator>
                <TimelineDot variant="outlined">
                  <AddShoppingCartIcon />
                </TimelineDot>
                <TimelineConnector />
              </TimelineSeparator>
              <TimelineContent>Add to cart</TimelineContent>
            </TimelineItem>
            <TimelineItem>
              <TimelineSeparator>
                <TimelineDot color="success">
                  <CheckCircleIcon />
                </TimelineDot>
              </TimelineSeparator>
              <TimelineContent>Pay and Enjoy</TimelineContent>
            </TimelineItem>
          </Timeline>
        </Box>
      </Modal>
    </div>
  );
};

export default App;