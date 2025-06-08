export const vnpayConfig = {
  vnp_TmnCode: process.env.VNP_TMN_CODE || "RWTMGW7Z",
  vnp_HashSecret:
    process.env.VNP_HASH_SECRET || "CF4OYDE0OVYA88ABZI9XHEAMPFVP59TL",
  vnp_Url:
    process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  vnp_Api:
    process.env.VNP_API ||
    "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
  vnp_ReturnUrl:
    process.env.VNP_RETURN_URL ||
    "https://b67b-14-232-68-100.ngrok-free.app/api/payment/vnpay-return",
  vnp_IpnUrl:
    process.env.VNP_IPN_URL ||
    "https://b67b-14-232-68-100.ngrok-free.app/api/payment/vnpay-ipn",
  vnp_Version: "2.1.0",
  vnp_Command: "pay",
  vnp_CurrCode: "VND",
  vnp_Locale: "vn",
};
