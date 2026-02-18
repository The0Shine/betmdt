import { IResponse } from "./response.interface";

export interface IPaymentCreateResult {
    // Defines what PaymentService.createPayment returns
    orderId?: string;
    amount?: number;
    paymentUrl?: string; // For VNPay
    message?: string; // For COD
    success?: boolean;
}

export type IPaymentCreateResponse = IResponse<IPaymentCreateResult>;

export interface IPaymentStatusResult {
    success: boolean;
    orderId: string;
    isPaid: boolean;
    paidAt?: Date;
    paymentResult?: any;
    status: string;
}

export type IPaymentStatusResponse = IResponse<IPaymentStatusResult>;
