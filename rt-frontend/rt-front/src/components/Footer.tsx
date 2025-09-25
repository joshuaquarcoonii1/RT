import React, { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const Footer: React.FC = () => {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const faqData: FAQItem[] = [
    {
      question: "What are your delivery options?",
      answer: "We offer delivery (1-2 business days) and express delivery (same day)."
    },
    {
      question: "What is your return policy?",
      answer: "We accept returns within 30 days of purchase. Items must be unworn, unwashed, and in original condition with tags attached."
    },
    {
      question: "How do I track my order?",
      answer: "Once your order is placed, you'll receive a receipt and be contacted on whether you'd prefer pick-up or delivery"
    },
    {
      question: "Do you offer international shipping?",
      answer: "Currently, we ship within Ghana and to select West African countries. International shipping rates apply."
    },
    {
      question: "How do I care for my garments?",
      answer: "Care instructions are included with each item. Generally, we recommend gentle machine wash or hand wash for delicate items."
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const handleWhatsAppClick = () => {
    const phoneNumber = "+233594523173"; // Replace with actual WhatsApp number
    const message = "Hello! I'm interested in your collection.";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <footer className="footer" id="footer">
      <div className="footer-content">
        {/* Main Footer Content */}
        <div className="footer-main">
          <div className="footer-section">
            <h3 className="footer-title">Collection</h3>
            <p className="footer-description">
              Curated fashion pieces for the modern wardrobe. Quality, style, and sustainability at the heart of everything we do.
            </p>
            <div className="social-links">
              <a 
                href="https://www.instagram.com/royal.threads.gh?igsh=Mm14dzIxcmQ2N2c0" 
                target="_blank" 
                rel="noopener noreferrer"
                className="social-link instagram"
                aria-label="Follow us on Instagram"
              >
                📸
              </a>
              <a 
                href="https://facebook.com/yourcollection" 
                target="_blank" 
                rel="noopener noreferrer"
                className="social-link facebook"
                aria-label="Follow us on Facebook"
              >
                📘
              </a>
              <a 
                href="https://twitter.com/yourcollection" 
                target="_blank" 
                rel="noopener noreferrer"
                className="social-link twitter"
                aria-label="Follow us on Twitter"
              >
                🐦
              </a>
            </div>
          </div>

          <div className="footer-section">
            <h4 className="footer-section-title">Contact Info</h4>
            <div className="contact-info">
              <div className="contact-item">
                <span className="contact-icon">📍</span>
                <div className="contact-details">
                  <p>89 Blue Lagoon Road, South Odorkor</p>
                  <p>Accra, Ghana</p>
                </div>
              </div>
              <div className="contact-item">
                <span className="contact-icon">📞</span>
                <div className="contact-details">
                  <p>+233 244 426 305</p>
                </div>
              </div>
              <div className="contact-item">
                <span className="contact-icon">✉️</span>
                <div className="contact-details">
                  <p>joshuaquarcoo97@gmail.com</p>
                </div>
              </div>
              <button className="whatsapp-btn" onClick={handleWhatsAppClick}>
                <span className="whatsapp-icon">💬</span>
                Chat on WhatsApp
              </button>
            </div>
          </div>

          {/* <div className="footer-section">
            <h4 className="footer-section-title">Quick Links</h4>
            <ul className="footer-links">
              <li><a href="#products">Products</a></li>
              <li><a href="#about">About Us</a></li>
              <li><a href="#contact">Contact</a></li>
              <li><a href="#size-guide">Size Guide</a></li>
              <li><a href="#terms">Terms & Conditions</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
            </ul>
          </div> */}

          <div className="footer-section">
            <h4 className="footer-section-title">Store Hours</h4>
            <ul className="store-hours">
              <li>
                <span>Monday - Friday</span>
                <span>9:00 AM - 7:00 PM</span>
              </li>
              <li>
                <span>Saturday</span>
                <span>10:00 AM - 6:00 PM</span>
              </li>
             
            </ul>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="faq-section">
          <h3 className="faq-title">Frequently Asked Questions</h3>
          <div className="faq-container">
            {faqData.map((faq, index) => (
              <div key={index} className="faq-item">
                <button
                  className={`faq-question ${openFAQ === index ? 'active' : ''}`}
                  onClick={() => toggleFAQ(index)}
                  aria-expanded={openFAQ === index}
                >
                  <span>{faq.question}</span>
                  <span className={`faq-toggle ${openFAQ === index ? 'open' : ''}`}>
                    {openFAQ === index ? '−' : '+'}
                  </span>
                </button>
                <div className={`faq-answer ${openFAQ === index ? 'open' : ''}`}>
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Newsletter Signup */}
        {/* <div className="newsletter-section">
          <h4 className="newsletter-title">Stay Updated</h4>
          <p className="newsletter-description">
            Subscribe to our newsletter for the latest updates and exclusive offers.
          </p>
          <div className="newsletter-form">
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="newsletter-input"
            />
            <button className="newsletter-btn">Subscribe</button>
          </div>
        </div> */}
      </div>

      {/* Footer Bottom */}
      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <p>&copy; 2025 Collection. All rights reserved.</p>
          <div className="payment-methods">
            <span>We accept:</span>
            <div className="payment-icons">
              <span className="payment-icon">💳</span>
              
              <span className="payment-icon">📱</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;