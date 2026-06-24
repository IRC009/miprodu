// functions/index.js — Punto de entrada (solo exports)
// Toda la lógica vive en src/handlers/ y src/triggers/

// Deploy trigger: 2026-05-15
const { onCall, onRequest } = require("firebase-functions/v2/https");
const { onDocumentUpdated, onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const { handleOnWaiterCallCreated } = require("./src/waiterCalls/triggers");

// ─────────────────────────────────────────────
// HANDLERS
// ─────────────────────────────────────────────

const { handleCreateSubscription, handleCancelSubscription, handleAdminRestore, verifySubscriptionExpiration } = require("./src/subscriptions/subscriptions");
const { handleCreateOrderPreference, handleProcessMPBrickPayment, handleCreateBoldPendingOrder } = require("./src/orders/payments");
const { handleWebhookMP, handleWebhookOrderPayment, handleWebhookOrderBold } = require("./src/webhooks/webhooks");
const { handleOnOrderUpdated } = require("./src/orders/triggers");
const { handleCreateStaffMember, handleDeleteStaffMember, handleStaffLogin } = require("./src/staff/staffHandlers");
const { handleArchiveInactiveReservation } = require("./src/reservations/triggers");
// const { noShowSweep } = require("./src/reservations/scheduledNoShow");
const { handleRegisterCustomDomain, handleCheckDomainStatus, handleDeleteCustomDomain } = require("./src/domains/domainHandlers");
const {
  dailyBackup,
  triggerManualBackup,
  restoreFromBackup,
  triggerRestaurantManualBackup,
  restoreRestaurantFromBackup,
  restoreRestaurantFromGlobalBackup
} = require("./src/backup/backupHandlers");

// ─────────────────────────────────────────────
// SUSCRIPCIONES
// ─────────────────────────────────────────────

exports.createSubscription       = onCall({ secrets: ["MP_ACCESS_TOKEN"] }, handleCreateSubscription);
exports.cancelSubscription       = onCall({ secrets: ["MP_ACCESS_TOKEN"] }, handleCancelSubscription);
exports.adminRestoreSubscription = onCall(handleAdminRestore);
exports.verifySubscriptionExpiration = onCall({ secrets: ["MP_ACCESS_TOKEN"] }, verifySubscriptionExpiration);

// ─────────────────────────────────────────────
// WEBHOOKS
// ─────────────────────────────────────────────

exports.webhookMP           = onRequest({ secrets: ["MP_ACCESS_TOKEN", "MP_WEBHOOK_SECRET"] }, handleWebhookMP);
exports.webhookOrderPayment = onRequest({ secrets: ["MP_ACCESS_TOKEN", "MP_WEBHOOK_SECRET"] }, handleWebhookOrderPayment);
exports.webhookOrderBold    = onRequest(handleWebhookOrderBold);

// ─────────────────────────────────────────────
// PAGOS DE ÓRDENES
// ─────────────────────────────────────────────

exports.createOrderPreference  = onCall({ secrets: ["MP_ACCESS_TOKEN"] }, handleCreateOrderPreference);
exports.processMPBrickPayment  = onCall({ secrets: ["MP_ACCESS_TOKEN"] }, handleProcessMPBrickPayment);
exports.createBoldPendingOrder = onCall(handleCreateBoldPendingOrder);

// ─────────────────────────────────────────────
// TRIGGERS
// ─────────────────────────────────────────────

exports.onOrderUpdated = onDocumentUpdated(
  "restaurants/{restaurantId}/active_orders/{orderId}",
  handleOnOrderUpdated
);

exports.onWaiterCallCreated = onDocumentCreated(
  "restaurants/{restaurantId}/waiter_calls/{callId}",
  handleOnWaiterCallCreated
);

// ─────────────────────────────────────────────
// GESTIÓN DE PERSONAL (STAFF)
// ─────────────────────────────────────────────

exports.createStaffMember = onCall(handleCreateStaffMember);
exports.deleteStaffMember = onCall(handleDeleteStaffMember);
exports.staffLogin        = onCall(handleStaffLogin);

// ─────────────────────────────────────────────
// RESERVAS
// ─────────────────────────────────────────────

exports.onReservationUpdated = onDocumentUpdated(
  "restaurants/{restaurantId}/reservations/{reservationId}",
  handleArchiveInactiveReservation
);

// exports.noShowSweep = noShowSweep;

// ─────────────────────────────────────────────
// RESPALDOS Y SEGURIDAD
// ─────────────────────────────────────────────
exports.dailyBackup = dailyBackup;
exports.triggerManualBackup = triggerManualBackup;
exports.restoreFromBackup = restoreFromBackup;
exports.triggerRestaurantManualBackup = triggerRestaurantManualBackup;
exports.restoreRestaurantFromBackup = restoreRestaurantFromBackup;
exports.restoreRestaurantFromGlobalBackup = restoreRestaurantFromGlobalBackup;

// ─────────────────────────────────────────────
// DOMINIOS PERSONALIZADOS
// ─────────────────────────────────────────────
exports.registerCustomDomain = onCall({ secrets: ["CF_API_TOKEN", "CF_ZONE_ID"] }, handleRegisterCustomDomain);
exports.checkDomainStatus    = onCall({ secrets: ["CF_API_TOKEN", "CF_ZONE_ID"] }, handleCheckDomainStatus);
exports.deleteCustomDomain   = onCall({ secrets: ["CF_API_TOKEN", "CF_ZONE_ID"] }, handleDeleteCustomDomain);
