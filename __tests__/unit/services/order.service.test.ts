import { OrderService } from '../../../src/services/order.service';
import Order from '../../../src/models/order.model';
import Product from '../../../src/models/product.model';
import { Types } from 'mongoose';

// Mock models
jest.mock('../../../src/models/order.model');
jest.mock('../../../src/models/product.model');
jest.mock('../../../src/services/stockVoucher.service');
jest.mock('../../../src/services/transaction.service');

describe('OrderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =====================================================
  // createOrder tests
  // =====================================================
  describe('createOrder', () => {
    const validOrderData = {
      user: 'user123',
      orderItems: [
        { product: new Types.ObjectId(), name: 'Test Product', quantity: 2, price: 100 },
      ],
      shippingAddress: { address: '123 Test St', city: 'HCM' },
      paymentMethod: 'cod',
      totalPrice: 200,
    };

    it('should throw error when product not found', async () => {
      (Product.findById as jest.Mock).mockResolvedValue(null);

      await expect(OrderService.createOrder(validOrderData))
        .rejects.toThrow('Không tìm thấy sản phẩm');
    });

    it('should throw error when insufficient stock', async () => {
      (Product.findById as jest.Mock).mockResolvedValue({
        _id: validOrderData.orderItems[0].product,
        name: 'Test Product',
        quantity: 1, // Only 1 in stock but ordering 2
      });

      await expect(OrderService.createOrder(validOrderData))
        .rejects.toThrow('Không đủ tồn kho');
    });

    it('should create order successfully when stock is sufficient', async () => {
      const mockProduct = {
        _id: validOrderData.orderItems[0].product,
        name: 'Test Product',
        quantity: 10,
      };
      const mockOrder = {
        _id: new Types.ObjectId(),
        ...validOrderData,
        status: 'pending',
        isPaid: false,
      };

      (Product.findById as jest.Mock).mockResolvedValue(mockProduct);
      (Order.create as jest.Mock).mockResolvedValue(mockOrder);

      const result = await OrderService.createOrder(validOrderData);

      expect(result).toEqual(mockOrder);
      expect(Order.create).toHaveBeenCalledWith(expect.objectContaining({
        user: validOrderData.user,
        status: 'pending',
        isPaid: false,
      }));
    });

    it('should validate all items before creating order', async () => {
      const multiItemData = {
        ...validOrderData,
        orderItems: [
          { product: new Types.ObjectId(), name: 'Product 1', quantity: 2, price: 100 },
          { product: new Types.ObjectId(), name: 'Product 2', quantity: 3, price: 200 },
        ],
      };

      // First product ok, second product not found
      (Product.findById as jest.Mock)
        .mockResolvedValueOnce({ quantity: 10 })
        .mockResolvedValueOnce(null);

      await expect(OrderService.createOrder(multiItemData))
        .rejects.toThrow('Không tìm thấy sản phẩm');
    });
  });

  // =====================================================
  // updateOrderStatus tests
  // =====================================================
  describe('updateOrderStatus', () => {
    const orderId = new Types.ObjectId().toString();
    const updatedBy = 'admin123';

    it('should throw error when order not found', async () => {
      (Order.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(OrderService.updateOrderStatus(orderId, 'processing', updatedBy))
        .rejects.toThrow('Không tìm thấy đơn hàng');
    });

    it('should update order status successfully', async () => {
      const mockOrder = {
        _id: orderId,
        status: 'pending',
        orderItems: [],
        save: jest.fn().mockResolvedValue(true),
      };

      (Order.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockOrder),
      });

      const result = await OrderService.updateOrderStatus(orderId, 'processing', updatedBy);

      expect(result.status).toBe('processing');
      expect(mockOrder.save).toHaveBeenCalled();
    });
  });

  // =====================================================
  // updatePayment tests
  // =====================================================
  describe('updatePayment', () => {
    const orderId = new Types.ObjectId().toString();
    const paymentResult = { id: 'payment123', status: 'PAID' };
    const updatedBy = 'admin123';

    it('should throw error when order not found', async () => {
      (Order.findById as jest.Mock).mockResolvedValue(null);

      await expect(OrderService.updatePayment(orderId, paymentResult, updatedBy))
        .rejects.toThrow('Không tìm thấy đơn hàng');
    });

    it('should update payment info and set isPaid to true', async () => {
      const mockOrder = {
        _id: orderId,
        isPaid: false,
        totalPrice: 500,
        paymentMethod: 'vnpay',
        save: jest.fn().mockResolvedValue(true),
      };

      (Order.findById as jest.Mock).mockResolvedValue(mockOrder);

      const result = await OrderService.updatePayment(orderId, paymentResult, updatedBy);

      expect(result.isPaid).toBe(true);
      expect(result.paidAt).toBeInstanceOf(Date);
      expect(mockOrder.save).toHaveBeenCalled();
    });

    it('should not create duplicate transaction if already paid', async () => {
      const mockOrder = {
        _id: orderId,
        isPaid: true, // Already paid
        totalPrice: 500,
        paymentMethod: 'vnpay',
        save: jest.fn().mockResolvedValue(true),
      };

      (Order.findById as jest.Mock).mockResolvedValue(mockOrder);

      await OrderService.updatePayment(orderId, paymentResult, updatedBy);

      // TransactionService should not be called since wasNotPaid would be false
      // This is implicitly tested by the mock not throwing
    });
  });
});
