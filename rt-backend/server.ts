import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!; // Use service key for backend
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Paystack transaction
app.post('/api/paystack/initialize', async (req, res) => {
  try {
    const { email, amount, metadata } = req.body;
    
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email,
        amount: amount * 100, // Convert to pesewas
        metadata: {
          ...metadata,
          custom_fields: [
            {
              display_name: "Order Items",
              variable_name: "order_items",
              value: JSON.stringify(metadata.items || [])
            }
          ]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Paystack initialization error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Paystack webhook endpoint
app.post('/api/paystack/webhook', async (req, res) => {
  try {
    const hash = require('crypto')
      .createHmac('sha512', PAYSTACK_SECRET_KEY!)
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { event, data } = req.body;

    if (event === 'charge.success') {
      // Create order in Supabase
      const orderData = {
        transaction_id: data.id,
        reference: data.reference,
        email: data.customer.email,
        amount: data.amount / 100, // Convert back to GHS
        status: 'paid',
        items: data.metadata?.custom_fields?.find(
          (field: any) => field.variable_name === 'order_items'
        )?.value ? JSON.parse(data.metadata.custom_fields.find(
          (field: any) => field.variable_name === 'order_items'
        ).value) : [],
        customer_name: data.metadata?.customer_name || '',
        customer_phone: data.metadata?.customer_phone || '',
        delivery_address: data.metadata?.delivery_address || '',
        delivery_method: data.metadata?.delivery_method || 'pickup',
        payment_method: 'paystack',
        paid_at: new Date().toISOString(),
      };

      const { data: order, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (error) {
        console.error('Error creating order:', error);
        return res.status(500).json({ error: 'Failed to create order' });
      }

      // The real-time subscription in the mobile app will automatically receive this
      console.log('Order created successfully:', order);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Get all orders (for admin)
app.get('/api/orders', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status
app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));