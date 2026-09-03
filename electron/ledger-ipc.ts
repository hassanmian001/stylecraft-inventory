import type { IpcMain } from "electron";

import type { LedgerPartyType, PaymentInput } from "../src/types/stylecraft-api.js";
export { ledgerChannels } from "./ipc-channels.js";
import { ledgerChannels } from "./ipc-channels.js";

export function registerLedgerHandlers(ipcMain: IpcMain) {
  ipcMain.handle(ledgerChannels.getSummary, async () => {
    const [{ getDatabasePath }, { getLedgerSummary }] = await Promise.all([import("../db/paths.js"), import("../db/ledger-service.js")]);

    return getLedgerSummary(getDatabasePath());
  });

  ipcMain.handle(ledgerChannels.getStatement, async (_event, partyType: LedgerPartyType, partyId: number) => {
    const [{ getDatabasePath }, { getLedgerStatement }] = await Promise.all([import("../db/paths.js"), import("../db/ledger-service.js")]);

    return getLedgerStatement(getDatabasePath(), partyType, partyId);
  });

  ipcMain.handle(ledgerChannels.recordPayment, async (_event, input: PaymentInput) => {
    const [{ getDatabasePath }, { recordPayment }] = await Promise.all([import("../db/paths.js"), import("../db/ledger-service.js")]);

    return recordPayment(getDatabasePath(), input);
  });

  ipcMain.handle(ledgerChannels.deletePayment, async (_event, id: number) => {
    const [{ getDatabasePath }, { deletePayment }] = await Promise.all([import("../db/paths.js"), import("../db/ledger-service.js")]);

    return deletePayment(getDatabasePath(), id);
  });
}
