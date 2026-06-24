const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * onWaiterCallCreated — Triggers when a waiter call is created in Firestore.
 * Sends push notifications to all registered tokens belonging to the same branch.
 */
async function handleOnWaiterCallCreated(event) {
  const newCall = event.data.data();
  if (!newCall) return null;

  const { restaurantId, callId } = event.params;
  const branchId = newCall.branchId;

  console.log(`[WaiterCallTrigger] New call detected: ${callId} for restaurant ${restaurantId}, branch ${branchId}`);

  try {
    // Fetch branch configuration to check if onlyAssignedWaitersSeeCalls is active
    let onlyAssignedWaitersSeeCalls = false;
    try {
      const branchDoc = await db.doc(`restaurants/${restaurantId}/branches/${branchId}`).get();
      if (branchDoc.exists) {
        onlyAssignedWaitersSeeCalls = branchDoc.data().onlyAssignedWaitersSeeCalls || false;
        console.log(`[WaiterCallTrigger] onlyAssignedWaitersSeeCalls for branch ${branchId}: ${onlyAssignedWaitersSeeCalls}`);
      }
    } catch (err) {
      console.warn(`[WaiterCallTrigger] Failed to check branch settings:`, err);
    }

    // Check if the table has an assigned waiter
    let assignedWaiterId = null;
    if (newCall.tableNumber) {
      try {
        const tableId = `table_${newCall.tableNumber}`;
        const tableDoc = await db.doc(`restaurants/${restaurantId}/branches/${branchId}/tables/${tableId}`).get();
        if (tableDoc.exists) {
          const rawWaiterId = tableDoc.data().assignedWaiterId || null;
          if (rawWaiterId) {
            // Check if the assigned waiter is in shift (checked in or excluded from attendance)
            const waiterDoc = await db.doc(`restaurants/${restaurantId}/waiters/${rawWaiterId}`).get();
            if (waiterDoc.exists) {
              const wData = waiterDoc.data();
              const isWaiterOnDuty = wData.isCheckedIn || wData.excludeFromAttendance || false;
              if (isWaiterOnDuty) {
                assignedWaiterId = rawWaiterId;
                console.log(`[WaiterCallTrigger] Table ${newCall.tableNumber} is assigned to waiter: ${assignedWaiterId} (On Duty)`);
              } else {
                console.log(`[WaiterCallTrigger] Table ${newCall.tableNumber} assigned waiter ${rawWaiterId} is OUT of shift. Treating table as unassigned.`);
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[WaiterCallTrigger] Failed to check table assignment:`, err);
      }
    }

    // 1. Fetch registered push tokens for this restaurant
    console.log(`[WaiterCallTrigger] Fetching tokens from path: restaurants/${restaurantId}/push_tokens`);
    const tokensSnap = await db.collection(`restaurants/${restaurantId}/push_tokens`).get();
    console.log(`[WaiterCallTrigger] Found ${tokensSnap.size} raw documents in push_tokens collection`);
    
    if (tokensSnap.empty) {
      console.log(`[WaiterCallTrigger] No push tokens registered for restaurant ${restaurantId}`);
      return null;
    }

    // 2. Filter tokens by branchId and assigned waiter
    const targets = [];
    tokensSnap.forEach(doc => {
      const data = doc.data();
      console.log(`[WaiterCallTrigger] Evaluating token doc ${doc.id}: token=${data.token}, branchId=${data.branchId}, waiterId=${data.waiterId}, role=${data.role}`);
      if (data.token && (!branchId || data.branchId === branchId || data.branchId === 'all')) {
        if (onlyAssignedWaitersSeeCalls && assignedWaiterId) {
          const isAssigned = data.waiterId === assignedWaiterId;
          const isAdmin = ['owner', 'admin', 'dueño'].includes(data.role);
          if (isAssigned || isAdmin) {
            targets.push(data.token);
          }
        } else {
          targets.push(data.token);
        }
      }
    });

    console.log(`[WaiterCallTrigger] Target tokens after filtering for branch ${branchId}:`, JSON.stringify(targets));

    if (targets.length === 0) {
      console.log(`[WaiterCallTrigger] No target push tokens found for branch ${branchId}`);
      return null;
    }

    console.log(`[WaiterCallTrigger] Sending notifications to ${targets.length} devices...`);

    // 3. Prepare messages for Expo's push notification service
    const messages = targets.map(token => ({
      to: token,
      title: "🔔 ¡Llamado de Mesero!",
      body: `Mesa ${newCall.tableNumber || 'N/A'} necesita atención`,
      sound: "waiter_bell.mp3",
      channelId: "waiter-calls-custom-sound",
      data: {
        screen: "restaurante",
        restaurantId,
        branchId,
        callId
      },
      priority: "high"
    }));

    // 4. Send messages to Expo API using global fetch
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(messages)
    });

    const resJson = await response.json();
    console.log(`[WaiterCallTrigger] Expo Response:`, JSON.stringify(resJson));

  } catch (error) {
    console.error("[WaiterCallTrigger] Error sending push notifications:", error);
  }

  return null;
}

module.exports = { handleOnWaiterCallCreated };
