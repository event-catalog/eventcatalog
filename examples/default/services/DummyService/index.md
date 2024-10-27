---
id: DummyService
version: 2.0.0
name: Dummy Service
summary: 'This is an example for a big api service, containing hundreds of commands'
schemaPath: openapi.yml
specifications:
  openapiPath: openapi.yml
receives:
  - id: app-service_GET_3dsecure
    version: 2.0.0
  - id: app-service_POST_3dsecure
    version: 2.0.0
  - id: 'app-service_PARAMETERS_3dsecure_{id}'
    version: 2.0.0
  - id: 'app-service_GET_3dsecure_{id}'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_activation_{token}'
    version: 2.0.0
  - id: 'app-service_POST_activation_{token}'
    version: 2.0.0
  - id: app-service_GET_api-keys
    version: 2.0.0
  - id: app-service_POST_api-keys
    version: 2.0.0
  - id: 'app-service_PARAMETERS_api-keys_{id}'
    version: 2.0.0
  - id: 'app-service_GET_api-keys_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_api-keys_{id}'
    version: 2.0.0
  - id: 'app-service_DELETE_api-keys_{id}'
    version: 2.0.0
  - id: app-service_GET_attachments
    version: 2.0.0
  - id: app-service_POST_attachments
    version: 2.0.0
  - id: 'app-service_PARAMETERS_attachments_{id}'
    version: 2.0.0
  - id: 'app-service_GET_attachments_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_attachments_{id}'
    version: 2.0.0
  - id: 'app-service_DELETE_attachments_{id}'
    version: 2.0.0
  - id: app-service_GET_authentication-options
    version: 2.0.0
  - id: app-service_PUT_authentication-options
    version: 2.0.0
  - id: app-service_GET_authentication-tokens
    version: 2.0.0
  - id: app-service_POST_authentication-tokens
    version: 2.0.0
  - id: 'app-service_PARAMETERS_authentication-tokens_{token}'
    version: 2.0.0
  - id: 'app-service_GET_authentication-tokens_{token}'
    version: 2.0.0
  - id: 'app-service_DELETE_authentication-tokens_{token}'
    version: 2.0.0
  - id: app-service_GET_bank-accounts
    version: 2.0.0
  - id: app-service_POST_bank-accounts
    version: 2.0.0
  - id: 'app-service_PARAMETERS_bank-accounts_{id}'
    version: 2.0.0
  - id: 'app-service_GET_bank-accounts_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_bank-accounts_{id}'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_bank-accounts_{id}_deactivation'
    version: 2.0.0
  - id: 'app-service_POST_bank-accounts_{id}_deactivation'
    version: 2.0.0
  - id: app-service_GET_blacklists
    version: 2.0.0
  - id: app-service_POST_blacklists
    version: 2.0.0
  - id: 'app-service_PARAMETERS_blacklists_{id}'
    version: 2.0.0
  - id: 'app-service_GET_blacklists_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_blacklists_{id}'
    version: 2.0.0
  - id: 'app-service_DELETE_blacklists_{id}'
    version: 2.0.0
  - id: app-service_GET_checkout-pages
    version: 2.0.0
  - id: app-service_POST_checkout-pages
    version: 2.0.0
  - id: 'app-service_PARAMETERS_checkout-pages_{id}'
    version: 2.0.0
  - id: 'app-service_GET_checkout-pages_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_checkout-pages_{id}'
    version: 2.0.0
  - id: 'app-service_DELETE_checkout-pages_{id}'
    version: 2.0.0
  - id: app-service_GET_contacts
    version: 2.0.0
  - id: app-service_POST_contacts
    version: 2.0.0
  - id: 'app-service_PARAMETERS_contacts_{id}'
    version: 2.0.0
  - id: 'app-service_GET_contacts_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_contacts_{id}'
    version: 2.0.0
  - id: 'app-service_DELETE_contacts_{id}'
    version: 2.0.0
  - id: app-service_GET_coupons-redemptions
    version: 2.0.0
  - id: app-service_POST_coupons-redemptions
    version: 2.0.0
  - id: 'app-service_PARAMETERS_coupons-redemptions_{id}'
    version: 2.0.0
  - id: 'app-service_GET_coupons-redemptions_{id}'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_coupons-redemptions_{id}_cancel'
    version: 2.0.0
  - id: 'app-service_POST_coupons-redemptions_{id}_cancel'
    version: 2.0.0
  - id: app-service_GET_coupons
    version: 2.0.0
  - id: app-service_POST_coupons
    version: 2.0.0
  - id: 'app-service_PARAMETERS_coupons_{redemptionCode}'
    version: 2.0.0
  - id: 'app-service_GET_coupons_{redemptionCode}'
    version: 2.0.0
  - id: 'app-service_PUT_coupons_{redemptionCode}'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_coupons_{redemptionCode}_expiration'
    version: 2.0.0
  - id: 'app-service_POST_coupons_{redemptionCode}_expiration'
    version: 2.0.0
  - id: app-service_POST_credential-hashes_emails
    version: 2.0.0
  - id: 'app-service_PARAMETERS_credential-hashes_emails_{hash}'
    version: 2.0.0
  - id: 'app-service_GET_credential-hashes_emails_{hash}'
    version: 2.0.0
  - id: app-service_POST_credential-hashes_webhooks
    version: 2.0.0
  - id: 'app-service_PARAMETERS_credential-hashes_webhooks_{hash}'
    version: 2.0.0
  - id: 'app-service_GET_credential-hashes_webhooks_{hash}'
    version: 2.0.0
  - id: app-service_GET_credentials
    version: 2.0.0
  - id: app-service_POST_credentials
    version: 2.0.0
  - id: 'app-service_PARAMETERS_credentials_{id}'
    version: 2.0.0
  - id: 'app-service_GET_credentials_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_credentials_{id}'
    version: 2.0.0
  - id: 'app-service_DELETE_credentials_{id}'
    version: 2.0.0
  - id: app-service_GET_custom-events
    version: 2.0.0
  - id: app-service_POST_custom-events
    version: 2.0.0
  - id: 'app-service_PARAMETERS_custom-events_{id}'
    version: 2.0.0
  - id: 'app-service_GET_custom-events_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_custom-events_{id}'
    version: 2.0.0
  - id: 'app-service_DELETE_custom-events_{id}'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_custom-events_{id}_rules'
    version: 2.0.0
  - id: 'app-service_GET_custom-events_{id}_rules'
    version: 2.0.0
  - id: 'app-service_PUT_custom-events_{id}_rules'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_custom-events_{id}_rules_history'
    version: 2.0.0
  - id: 'app-service_GET_custom-events_{id}_rules_history'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_custom-events_{id}_rules_history_{version}'
    version: 2.0.0
  - id: 'app-service_GET_custom-events_{id}_rules_history_{version}'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_custom-events_{id}_rules_versions_{version}'
    version: 2.0.0
  - id: 'app-service_GET_custom-events_{id}_rules_versions_{version}'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_custom-fields_{resource}'
    version: 2.0.0
  - id: 'app-service_GET_custom-fields_{resource}'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_custom-fields_{resource}_{name}'
    version: 2.0.0
  - id: 'app-service_GET_custom-fields_{resource}_{name}'
    version: 2.0.0
  - id: 'app-service_PUT_custom-fields_{resource}_{name}'
    version: 2.0.0
  - id: 'app-service_DELETE_custom-fields_{resource}_{name}'
    version: 2.0.0
  - id: app-service_GET_customers
    version: 2.0.0
  - id: app-service_POST_customers
    version: 2.0.0
  - id: 'app-service_PARAMETERS_customers_{id}'
    version: 2.0.0
  - id: 'app-service_GET_customers_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_customers_{id}'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_customers_{id}_lead-source'
    version: 2.0.0
  - id: 'app-service_GET_customers_{id}_lead-source'
    version: 2.0.0
  - id: 'app-service_PUT_customers_{id}_lead-source'
    version: 2.0.0
  - id: 'app-service_DELETE_customers_{id}_lead-source'
    version: 2.0.0
  - id: app-service_GET_disputes
    version: 2.0.0
  - id: app-service_POST_disputes
    version: 2.0.0
  - id: 'app-service_PARAMETERS_disputes_{id}'
    version: 2.0.0
  - id: 'app-service_GET_disputes_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_disputes_{id}'
    version: 2.0.0
  - id: app-service_GET_events
    version: 2.0.0
  - id: 'app-service_PARAMETERS_events_{eventType}'
    version: 2.0.0
  - id: 'app-service_GET_events_{eventType}'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_events_{eventType}_rules'
    version: 2.0.0
  - id: 'app-service_GET_events_{eventType}_rules'
    version: 2.0.0
  - id: 'app-service_PUT_events_{eventType}_rules'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_events_{eventType}_rules_history'
    version: 2.0.0
  - id: 'app-service_GET_events_{eventType}_rules_history'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_events_{eventType}_rules_history_{version}'
    version: 2.0.0
  - id: 'app-service_GET_events_{eventType}_rules_history_{version}'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_events_{eventType}_rules_versions_{version}'
    version: 2.0.0
  - id: 'app-service_GET_events_{eventType}_rules_versions_{version}'
    version: 2.0.0
  - id: app-service_GET_files
    version: 2.0.0
  - id: app-service_POST_files
    version: 2.0.0
  - id: 'app-service_PARAMETERS_files_{id}'
    version: 2.0.0
  - id: 'app-service_GET_files_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_files_{id}'
    version: 2.0.0
  - id: 'app-service_DELETE_files_{id}'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_files_{id}_download'
    version: 2.0.0
  - id: 'app-service_GET_files_{id}_download'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_files_{id}_download{extension}'
    version: 2.0.0
  - id: 'app-service_GET_files_{id}_download{extension}'
    version: 2.0.0
  - id: app-service_POST_forgot-password
    version: 2.0.0
  - id: app-service_GET_gateway-accounts
    version: 2.0.0
  - id: app-service_POST_gateway-accounts
    version: 2.0.0
  - id: 'app-service_PARAMETERS_gateway-accounts_{id}'
    version: 2.0.0
  - id: 'app-service_GET_gateway-accounts_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_gateway-accounts_{id}'
    version: 2.0.0
  - id: 'app-service_PATCH_gateway-accounts_{id}'
    version: 2.0.0
  - id: 'app-service_DELETE_gateway-accounts_{id}'
    version: 2.0.0
  - id: app-service_GET_invoices
    version: 2.0.0
  - id: app-service_POST_invoices
    version: 2.0.0
  - id: 'app-service_PARAMETERS_invoices_{id}'
    version: 2.0.0
  - id: 'app-service_GET_invoices_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_invoices_{id}'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_invoices_{id}_abandon'
    version: 2.0.0
  - id: 'app-service_POST_invoices_{id}_abandon'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_invoices_{id}_issue'
    version: 2.0.0
  - id: 'app-service_POST_invoices_{id}_issue'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_invoices_{id}_items'
    version: 2.0.0
  - id: 'app-service_GET_invoices_{id}_items'
    version: 2.0.0
  - id: 'app-service_POST_invoices_{id}_items'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_invoices_{id}_lead-source'
    version: 2.0.0
  - id: 'app-service_GET_invoices_{id}_lead-source'
    version: 2.0.0
  - id: 'app-service_PUT_invoices_{id}_lead-source'
    version: 2.0.0
  - id: 'app-service_DELETE_invoices_{id}_lead-source'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_invoices_{id}_void'
    version: 2.0.0
  - id: 'app-service_POST_invoices_{id}_void'
    version: 2.0.0
  - id: app-service_GET_layouts
    version: 2.0.0
  - id: app-service_POST_layouts
    version: 2.0.0
  - id: 'app-service_PARAMETERS_layouts_{id}'
    version: 2.0.0
  - id: 'app-service_GET_layouts_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_layouts_{id}'
    version: 2.0.0
  - id: 'app-service_DELETE_layouts_{id}'
    version: 2.0.0
  - id: app-service_GET_lists
    version: 2.0.0
  - id: app-service_POST_lists
    version: 2.0.0
  - id: 'app-service_PARAMETERS_lists_{id}'
    version: 2.0.0
  - id: 'app-service_GET_lists_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_lists_{id}'
    version: 2.0.0
  - id: 'app-service_DELETE_lists_{id}'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_lists_{id}_{version}'
    version: 2.0.0
  - id: 'app-service_GET_lists_{id}_{version}'
    version: 2.0.0
  - id: app-service_GET_notes
    version: 2.0.0
  - id: app-service_POST_notes
    version: 2.0.0
  - id: 'app-service_PARAMETERS_notes_{id}'
    version: 2.0.0
  - id: 'app-service_GET_notes_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_notes_{id}'
    version: 2.0.0
  - id: app-service_GET_organizations
    version: 2.0.0
  - id: app-service_POST_organizations
    version: 2.0.0
  - id: 'app-service_PARAMETERS_organizations_{id}'
    version: 2.0.0
  - id: 'app-service_GET_organizations_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_organizations_{id}'
    version: 2.0.0
  - id: 'app-service_DELETE_organizations_{id}'
    version: 2.0.0
  - id: app-service_GET_password-tokens
    version: 2.0.0
  - id: app-service_POST_password-tokens
    version: 2.0.0
  - id: 'app-service_PARAMETERS_password-tokens_{id}'
    version: 2.0.0
  - id: 'app-service_GET_password-tokens_{id}'
    version: 2.0.0
  - id: 'app-service_DELETE_password-tokens_{id}'
    version: 2.0.0
  - id: app-service_GET_payment-cards-migrations
    version: 2.0.0
  - id: app-service_POST_payment-cards-migrations_migrate
    version: 2.0.0
  - id: app-service_GET_payment-cards
    version: 2.0.0
  - id: app-service_POST_payment-cards
    version: 2.0.0
  - id: 'app-service_PARAMETERS_payment-cards_{id}'
    version: 2.0.0
  - id: 'app-service_GET_payment-cards_{id}'
    version: 2.0.0
  - id: 'app-service_PATCH_payment-cards_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_payment-cards_{id}'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_payment-cards_{id}_authorization'
    version: 2.0.0
  - id: 'app-service_POST_payment-cards_{id}_authorization'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_payment-cards_{id}_deactivation'
    version: 2.0.0
  - id: 'app-service_POST_payment-cards_{id}_deactivation'
    version: 2.0.0
  - id: app-service_GET_payments
    version: 2.0.0
  - id: app-service_POST_payments
    version: 2.0.0
  - id: 'app-service_PARAMETERS_payments_{id}'
    version: 2.0.0
  - id: 'app-service_GET_payments_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_payments_{id}'
    version: 2.0.0
  - id: app-service_GET_paypal-accounts
    version: 2.0.0
  - id: app-service_POST_paypal-accounts
    version: 2.0.0
  - id: 'app-service_PARAMETERS_paypal-accounts_{id}'
    version: 2.0.0
  - id: 'app-service_GET_paypal-accounts_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_paypal-accounts_{id}'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_paypal-accounts_{id}_activation'
    version: 2.0.0
  - id: 'app-service_POST_paypal-accounts_{id}_activation'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_paypal-accounts_{id}_deactivation'
    version: 2.0.0
  - id: 'app-service_POST_paypal-accounts_{id}_deactivation'
    version: 2.0.0
  - id: app-service_GET_plans
    version: 2.0.0
  - id: app-service_POST_plans
    version: 2.0.0
  - id: 'app-service_PARAMETERS_plans_{id}'
    version: 2.0.0
  - id: 'app-service_GET_plans_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_plans_{id}'
    version: 2.0.0
  - id: 'app-service_DELETE_plans_{id}'
    version: 2.0.0
  - id: app-service_POST_previews_rule-actions_send-email
    version: 2.0.0
  - id: app-service_POST_previews_rule-actions_trigger-webhook
    version: 2.0.0
  - id: app-service_POST_previews_webhooks
    version: 2.0.0
  - id: app-service_GET_products
    version: 2.0.0
  - id: app-service_POST_products
    version: 2.0.0
  - id: 'app-service_PARAMETERS_products_{id}'
    version: 2.0.0
  - id: 'app-service_GET_products_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_products_{id}'
    version: 2.0.0
  - id: 'app-service_DELETE_products_{id}'
    version: 2.0.0
  - id: app-service_GET_profile
    version: 2.0.0
  - id: app-service_PUT_profile
    version: 2.0.0
  - id: app-service_POST_profile_password
    version: 2.0.0
  - id: app-service_POST_profile_totp-reset
    version: 2.0.0
  - id: app-service_GET_queue_custom-events
    version: 2.0.0
  - id: 'app-service_PARAMETERS_queue_custom-events_{id}'
    version: 2.0.0
  - id: 'app-service_GET_queue_custom-events_{id}'
    version: 2.0.0
  - id: 'app-service_DELETE_queue_custom-events_{id}'
    version: 2.0.0
  - id: app-service_GET_queue_payments
    version: 2.0.0
  - id: 'app-service_PARAMETERS_queue_payments_{id}'
    version: 2.0.0
  - id: 'app-service_GET_queue_payments_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_queue_payments_{id}'
    version: 2.0.0
  - id: app-service_GET_sessions
    version: 2.0.0
  - id: app-service_POST_sessions
    version: 2.0.0
  - id: 'app-service_PARAMETERS_sessions_{id}'
    version: 2.0.0
  - id: 'app-service_GET_sessions_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_sessions_{id}'
    version: 2.0.0
  - id: 'app-service_DELETE_sessions_{id}'
    version: 2.0.0
  - id: app-service_GET_shipping-zones
    version: 2.0.0
  - id: app-service_POST_shipping-zones
    version: 2.0.0
  - id: 'app-service_PARAMETERS_shipping-zones_{id}'
    version: 2.0.0
  - id: 'app-service_GET_shipping-zones_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_shipping-zones_{id}'
    version: 2.0.0
  - id: 'app-service_DELETE_shipping-zones_{id}'
    version: 2.0.0
  - id: app-service_POST_signin
    version: 2.0.0
  - id: app-service_POST_signup
    version: 2.0.0
  - id: app-service_GET_status
    version: 2.0.0
  - id: app-service_GET_subscriptions
    version: 2.0.0
  - id: app-service_POST_subscriptions
    version: 2.0.0
  - id: 'app-service_PARAMETERS_subscriptions_{id}'
    version: 2.0.0
  - id: 'app-service_GET_subscriptions_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_subscriptions_{id}'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_subscriptions_{id}_cancel'
    version: 2.0.0
  - id: 'app-service_POST_subscriptions_{id}_cancel'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_subscriptions_{id}_lead-source'
    version: 2.0.0
  - id: 'app-service_GET_subscriptions_{id}_lead-source'
    version: 2.0.0
  - id: 'app-service_PUT_subscriptions_{id}_lead-source'
    version: 2.0.0
  - id: 'app-service_DELETE_subscriptions_{id}_lead-source'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_subscriptions_{id}_switch'
    version: 2.0.0
  - id: 'app-service_POST_subscriptions_{id}_switch'
    version: 2.0.0
  - id: app-service_GET_tax-categories
    version: 2.0.0
  - id: app-service_GET_tokens
    version: 2.0.0
  - id: app-service_POST_tokens
    version: 2.0.0
  - id: 'app-service_PARAMETERS_tokens_{token}'
    version: 2.0.0
  - id: 'app-service_GET_tokens_{token}'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_tokens_{token}_expiration'
    version: 2.0.0
  - id: 'app-service_POST_tokens_{token}_expiration'
    version: 2.0.0
  - id: app-service_GET_tracking_api
    version: 2.0.0
  - id: 'app-service_PARAMETERS_tracking_api_{id}'
    version: 2.0.0
  - id: 'app-service_GET_tracking_api_{id}'
    version: 2.0.0
  - id: app-service_GET_tracking_lists
    version: 2.0.0
  - id: app-service_GET_tracking_subscriptions
    version: 2.0.0
  - id: 'app-service_PARAMETERS_tracking_subscriptions_{id}'
    version: 2.0.0
  - id: 'app-service_GET_tracking_subscriptions_{id}'
    version: 2.0.0
  - id: app-service_GET_tracking_webhooks
    version: 2.0.0
  - id: 'app-service_PARAMETERS_tracking_webhooks_{id}'
    version: 2.0.0
  - id: 'app-service_GET_tracking_webhooks_{id}'
    version: 2.0.0
  - id: app-service_GET_tracking_website-webhooks
    version: 2.0.0
  - id: 'app-service_PARAMETERS_tracking_website-webhooks_{id}'
    version: 2.0.0
  - id: 'app-service_GET_tracking_website-webhooks_{id}'
    version: 2.0.0
  - id: app-service_GET_transactions
    version: 2.0.0
  - id: 'app-service_PARAMETERS_transactions_{id}'
    version: 2.0.0
  - id: 'app-service_GET_transactions_{id}'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_transactions_{id}_cancel'
    version: 2.0.0
  - id: 'app-service_POST_transactions_{id}_cancel'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_transactions_{id}_gateway-logs'
    version: 2.0.0
  - id: 'app-service_GET_transactions_{id}_gateway-logs'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_transactions_{id}_lead-source'
    version: 2.0.0
  - id: 'app-service_GET_transactions_{id}_lead-source'
    version: 2.0.0
  - id: 'app-service_PUT_transactions_{id}_lead-source'
    version: 2.0.0
  - id: 'app-service_DELETE_transactions_{id}_lead-source'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_transactions_{id}_refund'
    version: 2.0.0
  - id: 'app-service_POST_transactions_{id}_refund'
    version: 2.0.0
  - id: app-service_GET_users
    version: 2.0.0
  - id: app-service_POST_users
    version: 2.0.0
  - id: 'app-service_PARAMETERS_users_{id}'
    version: 2.0.0
  - id: 'app-service_GET_users_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_users_{id}'
    version: 2.0.0
  - id: 'app-service_DELETE_users_{id}'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_users_{id}_password'
    version: 2.0.0
  - id: 'app-service_POST_users_{id}_password'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_users_{id}_totp-reset'
    version: 2.0.0
  - id: 'app-service_POST_users_{id}_totp-reset'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_users_reset-password_{token}'
    version: 2.0.0
  - id: 'app-service_POST_users_reset-password_{token}'
    version: 2.0.0
  - id: app-service_GET_webhooks
    version: 2.0.0
  - id: app-service_POST_webhooks
    version: 2.0.0
  - id: 'app-service_PARAMETERS_webhooks_{id}'
    version: 2.0.0
  - id: 'app-service_GET_webhooks_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_webhooks_{id}'
    version: 2.0.0
  - id: app-service_GET_websites
    version: 2.0.0
  - id: app-service_POST_websites
    version: 2.0.0
  - id: 'app-service_PARAMETERS_websites_{id}'
    version: 2.0.0
  - id: 'app-service_GET_websites_{id}'
    version: 2.0.0
  - id: 'app-service_PUT_websites_{id}'
    version: 2.0.0
  - id: 'app-service_DELETE_websites_{id}'
    version: 2.0.0
  - id: 'app-service_PARAMETERS_websites_{id}_webhook'
    version: 2.0.0
  - id: 'app-service_GET_websites_{id}_webhook'
    version: 2.0.0
  - id: 'app-service_PUT_websites_{id}_webhook'
    version: 2.0.0
  - id: 'app-service_DELETE_websites_{id}_webhook'
    version: 2.0.0
---

## Architecture diagram
<NodeGraph />
