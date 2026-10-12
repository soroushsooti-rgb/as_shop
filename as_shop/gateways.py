"""Iranian payment adapters; amounts sent to providers are integer Rial."""
import re
from decimal import Decimal, InvalidOperation
from urllib.parse import urlsplit
import requests
import frappe
from frappe.utils import cint
SETTINGS = "AS Shop Payment Settings"
class GatewayUnavailable(Exception):
    pass
class GatewayRejected(Exception):
    def __init__(self, code):
        self.code = str(code)
        super().__init__("Gateway rejected the payment.")
def amount_rial(toman):
    try:
        value = Decimal(str(toman)) * 10
        if not value.is_finite() or value <= 0 or value != value.to_integral_value():
            raise ValueError()
        return int(value)
    except (ValueError, InvalidOperation):
        frappe.throw("Enter a valid payment amount.")
def validate_settings(doc):
    if doc.provider not in {"Zarinpal","Zibal"}:
        frappe.throw("Choose a supported Iranian gateway.")
    if cint(doc.reservation_minutes) not in range(5,61):
        frappe.throw("Payment reservation must be between 5 and 60 minutes.")
    try:
        fee=Decimal(str(doc.shipping_fee or 0))
        if not fee.is_finite() or fee<0 or fee*10 != (fee*10).to_integral_value():
            raise ValueError()
    except (ValueError,InvalidOperation):
        frappe.throw("Enter a valid non-negative shipping fee.")
    for field in ("public_shop_url","customer_website_url"):
        value=str(doc.get(field) or "")
        if not value and not doc.enabled:
            continue
        url=urlsplit(value)
        if url.scheme not in {"http","https"} or not url.hostname or url.username or url.password or url.query or url.fragment:
            frappe.throw("Configure a full website URL without credentials or query parameters.")
        if field=="public_shop_url" and url.path not in {"","/"}:
            frappe.throw("The Shop callback URL must be the website origin without a page path.")
        if doc.enabled and not doc.sandbox and (url.scheme!="https" or url.hostname=="localhost" or url.hostname.endswith(".localhost")):
            frappe.throw("Live payments require public HTTPS website URLs.")
def settings():
    return frappe.get_single(SETTINGS)
def public_settings():
    doc=settings()
    ready=bool(doc.enabled and (doc.get_password("merchant_id",raise_exception=False) or (doc.provider=="Zibal" and doc.sandbox)) and doc.public_shop_url and doc.customer_website_url)
    return {"enabled":bool(doc.enabled),"ready":ready,"provider":doc.provider or "Zarinpal","sandbox":bool(doc.sandbox),
            "shipping_fee":float(doc.shipping_fee or 0),"shipping_description":doc.shipping_description or "",
            "reservation_minutes":cint(doc.reservation_minutes or 20)}
def post(url, data):
    try:
        response=requests.post(url,json=data,timeout=(10,25),allow_redirects=False,headers={"Accept":"application/json"})
        if response.status_code>=500:
            raise GatewayUnavailable()
        body=response.json()
        if not isinstance(body,dict):
            raise GatewayUnavailable()
        return body
    except (requests.RequestException,ValueError):
        raise GatewayUnavailable() from None
def credential(doc):
    if doc.provider=="Zibal" and doc.sandbox:return "zibal"
    value=doc.get_password("merchant_id",raise_exception=False)
    if not value:
        frappe.throw("Configure the merchant credential before enabling payment.")
    return "zibal" if doc.provider=="Zibal" and doc.sandbox else value
def request_payment(attempt, callback, mobile):
    key=attempt.get_password("gateway_key")
    amount=int(attempt.amount_rial)
    if attempt.provider=="Zarinpal":
        host="sandbox.zarinpal.com" if attempt.sandbox else "api.zarinpal.com"
        body=post("https://"+host+"/pg/v4/payment/request.json",
            {"merchant_id":key,"amount":amount,"currency":"IRR","callback_url":callback,
             "description":"AS order "+attempt.order,"metadata":{"mobile":mobile}})
        data=body.get("data") or {}
        if not isinstance(data,dict) or data.get("code")!=100:
            errors=body.get("errors") or {}
            raise GatewayRejected(errors.get("code","request") if isinstance(errors,dict) else "request")
        authority=str(data.get("authority") or "")
        if not re.fullmatch(r"[A-Za-z0-9]{20,100}",authority):
            raise GatewayUnavailable()
        start="https://sandbox.zarinpal.com/pg/StartPay/" if attempt.sandbox else "https://www.zarinpal.com/pg/StartPay/"
        return authority,start+authority
    body=post("https://gateway.zibal.ir/v1/request",
        {"merchant":key,"amount":amount,"callbackUrl":callback,"description":"AS order "+attempt.order,
         "mobile":mobile,"orderId":attempt.order})
    if body.get("result")!=100:
        raise GatewayRejected(body.get("result","request"))
    authority=str(body.get("trackId") or "")
    if not re.fullmatch(r"[0-9]{1,30}",authority):
        raise GatewayUnavailable()
    return authority,"https://gateway.zibal.ir/start/"+authority
def verify_payment(attempt):
    key=attempt.get_password("gateway_key")
    if attempt.provider=="Zarinpal":
        host="sandbox.zarinpal.com" if attempt.sandbox else "api.zarinpal.com"
        body=post("https://"+host+"/pg/v4/payment/verify.json",
            {"merchant_id":key,"amount":int(attempt.amount_rial),"authority":attempt.authority})
        data=body.get("data") or {}
        if not isinstance(data,dict) or data.get("code") not in (100,101):
            errors=body.get("errors") or {}
            raise GatewayRejected(errors.get("code","verify") if isinstance(errors,dict) else "verify")
        reference=str(data.get("ref_id") or "")
        if not re.fullmatch(r"[0-9]{1,100}",reference):
            raise GatewayUnavailable()
        return reference,str(data["code"])
    body=post("https://gateway.zibal.ir/v1/verify",{"merchant":key,"trackId":int(attempt.authority)})
    if body.get("result")==201:
        body=post("https://gateway.zibal.ir/v1/inquiry",{"merchant":key,"trackId":int(attempt.authority)})
    if body.get("result")!=100 or body.get("status") not in (1,2):
        raise GatewayRejected(body.get("result","verify"))
    try:
        verified_amount=Decimal(str(body.get("amount")))
    except InvalidOperation:
        raise GatewayUnavailable() from None
    if verified_amount != Decimal(str(attempt.amount_rial)):
        raise GatewayRejected("amount_mismatch")
    return str(body.get("refNumber") or body.get("trackId") or attempt.authority),str(body["result"])
