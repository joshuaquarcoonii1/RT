import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
// Use JSON parser for regular routes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// For Paystack webhooks we need the raw body to verify signature
app.use('/api/paystack/webhook', express.raw({ type: '*/*' }));

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!; // Use service key for backend
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * This server connects to a Supabase database.
 * It expects an 'orders' table to exist, which can be created
 * using the schema defined in 'schema.sql'.
 */

// Interface defining the structure of an Order for type safety.
// This should match the columns in your 'orders' table in Supabase.
interface Order {
  id?: number;
  created_at?: string;
  transaction_id: number;
  reference: string;
  email: string | null;
  amount: number;
  status: 'paid' | 'shipped' | 'delivered' | 'cancelled'; // Extend with any other statuses you use
  items: any[]; // You can define a more specific type for items if needed
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  delivery_method: string;
  payment_method: string;
  paid_at: string;
  raw_payload: any;
  updated_at?: string;
}


// Initialize Paystack transaction
app.post('/api/paystack/initialize', async (req, res) => {
  try {
    const { email, amount, metadata } = req.body;
    
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email:'joshuaquarcoonii1@gmail.com',
        amount: amount * 100, // Convert to GHS
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
    const rawBody = req.body as Buffer;
    const computedHash = require('crypto')
      .createHmac('sha512', PAYSTACK_SECRET_KEY!)
      .update(rawBody)
      .digest('hex');

    const signature = (req.headers['x-paystack-signature'] || '') as string;
    if (computedHash !== signature) {
      console.warn('Invalid webhook signature', { computedHash, signature });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const parsed = JSON.parse(rawBody.toString('utf8'));
    const { event, data } = parsed;

    if (event === 'charge.success') {
      const reference = data.reference;

      // Check idempotency: if an order with this reference already exists, skip
      const { data: existingOrders, error: fetchError } = await supabase
        .from('orders')
        .select('reference')
        .eq('reference', reference)
        .limit(1);

      if (fetchError) {
        console.error('Error checking existing order:', fetchError);
        return res.status(500).json({ error: 'Failed to verify order' });
      }

      if (existingOrders && existingOrders.length > 0) {
        console.log('Order with reference already exists, skipping insert:', reference);
        return res.status(200).json({ received: true, skipped: true });
      }

      // Parse items from metadata if present
      let items = [];
      try {
        const field = data.metadata?.custom_fields?.find((f: any) => f.variable_name === 'order_items');
        if (field && field.value) items = JSON.parse(field.value);
      } catch (err) {
        console.warn('Failed to parse order items from metadata', err);
      }

      const orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'> = {
        transaction_id: data.id,
        reference,
        email: data.customer?.email || null,
        amount: (data.amount || 0) / 100, // Convert from pesewas
        status: 'paid',
        items,
        customer_name: data.metadata?.customer_name || null,
        customer_phone: data.metadata?.customer_phone || null,
        delivery_address: data.metadata?.delivery_address || null,
        delivery_method: data.metadata?.delivery_method || 'pickup',
        payment_method: 'paystack',
        paid_at: new Date().toISOString(),
        raw_payload: parsed,
      };

      const { data: order, error: insertError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (insertError) {
        console.error('Error creating order:', insertError);
        return res.status(500).json({ error: 'Failed to create order' });
      }

      console.log('Order created successfully:', order.id);
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

    if (!status) {
        return res.status(400).json({ error: 'Status is required' });
    }

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
