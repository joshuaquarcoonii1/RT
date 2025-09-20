import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
  StatusBar,
  SafeAreaView,
  Vibration,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { createClient } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Initialize Supabase (replace with your credentials)
const supabaseUrl = 'https://vwaynpocidjouvfdzaqd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3YXlucG9jaWRqb3V2ZmR6YXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5MjIxODMsImV4cCI6MjA2NjQ5ODE4M30.-uMbTL38U3KrH59_2ddaRdq730OKxo8z9UhzyUk3kVw';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Request notification permissions
    registerForPushNotificationsAsync();

    // Load initial orders
    fetchOrders();

    // Set up real-time subscription
    const subscription = supabase
      .channel('orders-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        async (payload) => {
          console.log('New order received:', payload.new);
          const newOrder = payload.new;
          
          // Play sound and vibrate
          playNotificationSound();
          Vibration.vibrate([0, 500, 200, 500]);
          
          // Show local notification
          await schedulePushNotification(newOrder);
          
          // Update orders list
          setOrders(prev => [newOrder, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('Order updated:', payload.new);
          const updatedOrder = payload.new;
          setOrders(prev =>
            prev.map(order =>
              order.id === updatedOrder.id ? updatedOrder : order
            )
          );
        }
      )
      .subscribe();

    // Notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(
      notification => {
        console.log('Notification received:', notification);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      response => {
        console.log('Notification response:', response);
      }
    );

    return () => {
      subscription.unsubscribe();
      // remove listeners safely (newer expo-notifications returns a subscription with .remove())
      try {
        if (notificationListener.current && typeof notificationListener.current.remove === 'function') {
          notificationListener.current.remove();
        } else if (notificationListener.current && Notifications.removeNotificationSubscription) {
          Notifications.removeNotificationSubscription(notificationListener.current);
        }
      } catch (e) {
        console.warn('Failed to remove notificationListener', e);
      }

      try {
        if (responseListener.current && typeof responseListener.current.remove === 'function') {
          responseListener.current.remove();
        } else if (responseListener.current && Notifications.removeNotificationSubscription) {
          Notifications.removeNotificationSubscription(responseListener.current);
        }
      } catch (e) {
        console.warn('Failed to remove responseListener', e);
      }
    };
  }, []);

  const registerForPushNotificationsAsync = async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Orders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert('Failed to get push token for push notification!');
      return;
    }
  };

  const playNotificationSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/notification.mp3'), // You'll need to add a sound file
        { shouldPlay: true }
      );
      await sound.playAsync();
    } catch (error) {
      console.log('Error playing sound:', error);
    }
  };

  const schedulePushNotification = async (order) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎉 New Order Received!',
  body: `Order #${(order.reference || '').slice(-6)} - GH₵${(order.amount || 0).toFixed(2)}`,
        data: { orderId: order.id },
        sound: true,
      },
      trigger: null, // Show immediately
    });
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to fetch orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const updateData = { status: newStatus };
      
      // Add timestamp based on status
      if (newStatus === 'processing') {
        updateData.processed_at = new Date().toISOString();
      } else if (newStatus === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;
      
      Alert.alert('Success', 'Order status updated');
    } catch (error)      {
      console.error('Error updating order:', error);
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#10B981';
      case 'processing': return '#3B82F6';
      case 'ready': return '#F59E0B';
      case 'delivered': return '#6366F1';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return 'checkmark-circle';
      case 'processing': return 'time';
      case 'ready': return 'cube';
      case 'delivered': return 'checkmark-done';
      case 'cancelled': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      (order.reference || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const OrderCard = ({ order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => {
        setSelectedOrder(order);
        setModalVisible(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderReference}>#{(order.reference || '').slice(-6)}</Text>
          <Text style={styles.orderDate}>
            {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Ionicons name={getStatusIcon(order.status)} size={14} color="white" />
          <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.orderBody}>
  <Text style={styles.customerName}>{order.customer_name || 'Guest'}</Text>
  <Text style={styles.orderAmount}>GH₵{((order.amount || 0)).toFixed(2)}</Text>
  <Text style={styles.itemCount}>{(order.items || []).length} items</Text>
      </View>

      {order.status === 'paid' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.processButton]}
            onPress={() => updateOrderStatus(order.id, 'processing')}
          >
            <Text style={styles.actionButtonText}>Start Processing</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  const OrderDetailsModal = () => {
    if (!selectedOrder) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Order Information</Text>
                <Text style={styles.detailText}>Reference: #{(selectedOrder.reference || '').slice(-6)}</Text>
                <Text style={styles.detailText}>Date: {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : 'N/A'}</Text>
                <Text style={styles.detailText}>Status: {selectedOrder.status || 'N/A'}</Text>
                <Text style={styles.detailText}>Amount: GH₵{((selectedOrder.amount || 0)).toFixed(2)}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Customer Information</Text>
                <Text style={styles.detailText}>Name: {selectedOrder.customer_name || 'N/A'}</Text>
                <Text style={styles.detailText}>Email: {selectedOrder.email || 'N/A'}</Text>
                <Text style={styles.detailText}>Phone: {selectedOrder.customer_phone || 'N/A'}</Text>
                <Text style={styles.detailText}>Delivery: {selectedOrder.delivery_method}</Text>
                {selectedOrder.delivery_address && (
                  <Text style={styles.detailText}>Address: {selectedOrder.delivery_address}</Text>
                )}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Order Items</Text>
                {(selectedOrder.items || []).map((item, index) => (
                  <View key={index} style={styles.itemDetail}>
                    <Text style={styles.itemName}>{(item.product && item.product.name) || 'Product'}</Text>
                    {item.variant && (
                      <Text style={styles.itemVariant}>Size: {item.variant.Size}</Text>
                    )}
                    <Text style={styles.itemQuantity}>
                      {item.quantity} x GH₵{((item.price || 0)).toFixed(2)} = GH₵{((item.quantity || 0) * (item.price || 0)).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.statusActions}>
                {selectedOrder.status === 'paid' && (
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: '#3B82F6' }]}
                    onPress={() => {
                      updateOrderStatus(selectedOrder.id, 'processing');
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.statusButtonText}>Mark as Processing</Text>
                  </TouchableOpacity>
                )}
                {selectedOrder.status === 'processing' && (
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: '#F59E0B' }]}
                    onPress={() => {
                      updateOrderStatus(selectedOrder.id, 'ready');
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.statusButtonText}>Mark as Ready</Text>
                  </TouchableOpacity>
                )}
                {selectedOrder.status === 'ready' && (
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: '#10B981' }]}
                    onPress={() => {
                      updateOrderStatus(selectedOrder.id, 'delivered');
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.statusButtonText}>Mark as Delivered</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Royal Threads Admin</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search orders..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
      >
        {['all', 'paid', 'processing', 'ready', 'delivered'].map(status => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              statusFilter === status && styles.filterButtonActive
            ]}
            onPress={() => setStatusFilter(status)}
          >
            <Text
              style={[
                styles.filterText,
                statusFilter === status && styles.filterTextActive
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.ordersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        ) : (
          filteredOrders.map(order => (
            <OrderCard key={order.id} order={order} />
          ))
        )}
      </ScrollView>

      <OrderDetailsModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingTop: Constants.statusBarHeight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#374151',
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
    maxHeight: 48,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 36,
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  ordersList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderReference: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  orderDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  orderBody: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  itemCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  processButton: {
    backgroundColor: '#3B82F6',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 16,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  modalBody: {
    flexGrow: 1,
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },
  itemDetail: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  itemVariant: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statusActions: {
    marginTop: 16,
  },
  statusButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});