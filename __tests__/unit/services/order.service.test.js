"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const order_service_1 = require("../../../src/services/order.service");
const order_model_1 = __importDefault(require("../../../src/models/order.model"));
const product_model_1 = __importDefault(require("../../../src/models/product.model"));
const mongoose_1 = require("mongoose");
jest.mock('../../../src/models/order.model');
jest.mock('../../../src/models/product.model');
jest.mock('../../../src/services/stockVoucher.service');
jest.mock('../../../src/services/transaction.service');
describe('OrderService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('createOrder', () => {
        const validOrderData = {
            user: 'user123',
            orderItems: [
                { product: new mongoose_1.Types.ObjectId(), name: 'Test Product', quantity: 2, price: 100 },
            ],
            shippingAddress: { address: '123 Test St', city: 'HCM' },
            paymentMethod: 'cod',
            totalPrice: 200,
        };
        it('should throw error when product not found', () => __awaiter(void 0, void 0, void 0, function* () {
            product_model_1.default.findById.mockResolvedValue(null);
            yield expect(order_service_1.OrderService.createOrder(validOrderData))
                .rejects.toThrow('Không tìm thấy sản phẩm');
        }));
        it('should throw error when insufficient stock', () => __awaiter(void 0, void 0, void 0, function* () {
            product_model_1.default.findById.mockResolvedValue({
                _id: validOrderData.orderItems[0].product,
                name: 'Test Product',
                quantity: 1,
            });
            yield expect(order_service_1.OrderService.createOrder(validOrderData))
                .rejects.toThrow('Không đủ tồn kho');
        }));
        it('should create order successfully when stock is sufficient', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockProduct = {
                _id: validOrderData.orderItems[0].product,
                name: 'Test Product',
                quantity: 10,
            };
            const mockOrder = Object.assign(Object.assign({ _id: new mongoose_1.Types.ObjectId() }, validOrderData), { status: 'pending', isPaid: false });
            product_model_1.default.findById.mockResolvedValue(mockProduct);
            order_model_1.default.create.mockResolvedValue(mockOrder);
            const result = yield order_service_1.OrderService.createOrder(validOrderData);
            expect(result).toEqual(mockOrder);
            expect(order_model_1.default.create).toHaveBeenCalledWith(expect.objectContaining({
                user: validOrderData.user,
                status: 'pending',
                isPaid: false,
            }));
        }));
        it('should validate all items before creating order', () => __awaiter(void 0, void 0, void 0, function* () {
            const multiItemData = Object.assign(Object.assign({}, validOrderData), { orderItems: [
                    { product: new mongoose_1.Types.ObjectId(), name: 'Product 1', quantity: 2, price: 100 },
                    { product: new mongoose_1.Types.ObjectId(), name: 'Product 2', quantity: 3, price: 200 },
                ] });
            product_model_1.default.findById
                .mockResolvedValueOnce({ quantity: 10 })
                .mockResolvedValueOnce(null);
            yield expect(order_service_1.OrderService.createOrder(multiItemData))
                .rejects.toThrow('Không tìm thấy sản phẩm');
        }));
    });
    describe('updateOrderStatus', () => {
        const orderId = new mongoose_1.Types.ObjectId().toString();
        const updatedBy = 'admin123';
        it('should throw error when order not found', () => __awaiter(void 0, void 0, void 0, function* () {
            order_model_1.default.findById.mockReturnValue({
                populate: jest.fn().mockResolvedValue(null),
            });
            yield expect(order_service_1.OrderService.updateOrderStatus(orderId, 'processing', updatedBy))
                .rejects.toThrow('Không tìm thấy đơn hàng');
        }));
        it('should update order status successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockOrder = {
                _id: orderId,
                status: 'pending',
                orderItems: [],
                save: jest.fn().mockResolvedValue(true),
            };
            order_model_1.default.findById.mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockOrder),
            });
            const result = yield order_service_1.OrderService.updateOrderStatus(orderId, 'processing', updatedBy);
            expect(result.status).toBe('processing');
            expect(mockOrder.save).toHaveBeenCalled();
        }));
    });
    describe('updatePayment', () => {
        const orderId = new mongoose_1.Types.ObjectId().toString();
        const paymentResult = { id: 'payment123', status: 'PAID' };
        const updatedBy = 'admin123';
        it('should throw error when order not found', () => __awaiter(void 0, void 0, void 0, function* () {
            order_model_1.default.findById.mockResolvedValue(null);
            yield expect(order_service_1.OrderService.updatePayment(orderId, paymentResult, updatedBy))
                .rejects.toThrow('Không tìm thấy đơn hàng');
        }));
        it('should update payment info and set isPaid to true', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockOrder = {
                _id: orderId,
                isPaid: false,
                totalPrice: 500,
                paymentMethod: 'vnpay',
                save: jest.fn().mockResolvedValue(true),
            };
            order_model_1.default.findById.mockResolvedValue(mockOrder);
            const result = yield order_service_1.OrderService.updatePayment(orderId, paymentResult, updatedBy);
            expect(result.isPaid).toBe(true);
            expect(result.paidAt).toBeInstanceOf(Date);
            expect(mockOrder.save).toHaveBeenCalled();
        }));
        it('should not create duplicate transaction if already paid', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockOrder = {
                _id: orderId,
                isPaid: true,
                totalPrice: 500,
                paymentMethod: 'vnpay',
                save: jest.fn().mockResolvedValue(true),
            };
            order_model_1.default.findById.mockResolvedValue(mockOrder);
            yield order_service_1.OrderService.updatePayment(orderId, paymentResult, updatedBy);
        }));
    });
});
//# sourceMappingURL=order.service.test.js.map