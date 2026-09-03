import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { styleCraftEmail, styleCraftPhone } from "@/lib/branding";
import type { BackupResultDto, BackupSettingsDto, BusinessSettingsDto, RestoreResultDto } from "@/types/stylecraft-api";

const defaultBusinessForm: BusinessSettingsDto = {
  businessName: "StyleCraft",
  phone: styleCraftPhone,
  email: styleCraftEmail,
  address: null,
  currencySymbol: "Rs.",
  invoicePrefix: "INV",
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function SettingsScreen() {
  const [backupSettings, setBackupSettings] = useState<BackupSettingsDto | null>(null);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettingsDto | null>(null);
  const [businessForm, setBusinessForm] = useState<BusinessSettingsDto>(defaultBusinessForm);
  const [backupLocation, setBackupLocation] = useState("");
  const [restorePath, setRestorePath] = useState("");
  const [lastBackup, setLastBackup] = useState<BackupResultDto | null>(null);
  const [lastRestore, setLastRestore] = useState<RestoreResultDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSettings() {
    setIsLoading(true);
    setError(null);

    try {
      const [loadedBackupSettings, loadedBusinessSettings] = await Promise.all([
        window.stylecraft.backup.getSettings(),
        window.stylecraft.settings.getBusinessSettings(),
      ]);

      setBackupSettings(loadedBackupSettings);
      setBusinessSettings(loadedBusinessSettings);
      setBusinessForm(loadedBusinessSettings);
      setBackupLocation(loadedBackupSettings.backupLocation);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load settings.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  async function handleChooseDirectory() {
    setError(null);

    try {
      const selectedDirectory = await window.stylecraft.backup.chooseDirectory();

      if (selectedDirectory !== null) {
        setBackupLocation(selectedDirectory);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not choose backup folder.");
    }
  }

  async function handleSaveLocation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsWorking(true);

    try {
      const updatedSettings = await window.stylecraft.backup.updateLocation(backupLocation);
      setBackupSettings(updatedSettings);
      setBackupLocation(updatedSettings.backupLocation);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not save backup location.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleSaveBusinessSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsWorking(true);

    try {
      const updatedSettings = await window.stylecraft.settings.updateBusinessSettings(businessForm);
      setBusinessSettings(updatedSettings);
      setBusinessForm(updatedSettings);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not save business settings.");
    } finally {
      setIsWorking(false);
    }
  }

  function updateBusinessForm(changes: Partial<BusinessSettingsDto>) {
    setBusinessForm((current) => ({ ...current, ...changes }));
  }

  async function handleCreateBackup() {
    setError(null);
    setLastBackup(null);
    setIsWorking(true);

    try {
      setLastBackup(await window.stylecraft.backup.create());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not create backup.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleChooseFile() {
    setError(null);

    try {
      const selectedFile = await window.stylecraft.backup.chooseFile();

      if (selectedFile !== null) {
        setRestorePath(selectedFile);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not choose backup file.");
    }
  }

  async function handleRestore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLastRestore(null);
    setIsWorking(true);

    try {
      setLastRestore(await window.stylecraft.backup.restore(restorePath));
      await loadSettings();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not restore backup.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">Milestone 9 backup and restore</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">Settings</h2>
          <p className="mt-2 max-w-2xl text-slate-600">Choose where database backups are saved, create manual backups, and restore from a saved SQLite backup file.</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      {isLoading || backupSettings === null || businessSettings === null ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">Loading settings...</div>
      ) : (
        <>
          <form className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" noValidate onSubmit={handleSaveBusinessSettings}>
            <div>
              <h3 className="font-semibold text-slate-950">Business profile</h3>
              <p className="mt-1 text-sm text-slate-500">These details appear on invoices and printable documents.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="business-name">
                Business name
                <input
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  id="business-name"
                  onChange={(event) => updateBusinessForm({ businessName: event.target.value })}
                  value={businessForm.businessName}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="business-phone">
                Phone
                <input
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  id="business-phone"
                  onChange={(event) => updateBusinessForm({ phone: event.target.value })}
                  value={businessForm.phone ?? ""}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="business-email">
                Email
                <input
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  id="business-email"
                  onChange={(event) => updateBusinessForm({ email: event.target.value })}
                  value={businessForm.email ?? ""}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="currency-symbol">
                Currency symbol
                <input
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  id="currency-symbol"
                  onChange={(event) => updateBusinessForm({ currencySymbol: event.target.value })}
                  value={businessForm.currencySymbol}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700 md:col-span-2" htmlFor="business-address">
                Address
                <textarea
                  className="min-h-20 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  id="business-address"
                  onChange={(event) => updateBusinessForm({ address: event.target.value })}
                  value={businessForm.address ?? ""}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="invoice-prefix">
                Invoice prefix
                <input
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  id="invoice-prefix"
                  onChange={(event) => updateBusinessForm({ invoicePrefix: event.target.value })}
                  value={businessForm.invoicePrefix}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button disabled={isWorking} type="submit">
                Save business settings
              </Button>
            </div>
          </form>

          <form className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" noValidate onSubmit={handleSaveLocation}>
            <div>
              <h3 className="font-semibold text-slate-950">Backup location</h3>
              <p className="mt-1 text-sm text-slate-500">Current location: {backupSettings.backupLocation}</p>
              <p className="mt-1 text-xs text-slate-500">{backupSettings.isDefaultLocation ? "Using the default local backup folder." : "Using a saved custom backup folder."}</p>
            </div>

            <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="backup-location">
              Backup folder
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                id="backup-location"
                onChange={(event) => setBackupLocation(event.target.value)}
                value={backupLocation}
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <Button disabled={isWorking} onClick={handleChooseDirectory} type="button" variant="ghost">
                Choose folder
              </Button>
              <Button disabled={isWorking} type="submit">
                Save location
              </Button>
            </div>
          </form>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="font-semibold text-slate-950">Create manual backup</h3>
                <p className="mt-1 text-sm text-slate-500">Backup filenames include date and time, and existing backup files are not overwritten.</p>
              </div>
              <Button disabled={isWorking} onClick={handleCreateBackup} type="button">
                Create backup
              </Button>
            </div>
            {lastBackup ? (
              <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
                Backup created at {formatDateTime(lastBackup.createdAt)}: {lastBackup.backupPath}
              </div>
            ) : null}
          </section>

          <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" noValidate onSubmit={handleRestore}>
            <div>
              <h3 className="font-semibold text-slate-950">Restore from backup</h3>
              <p className="mt-1 text-sm text-slate-500">Restoring replaces the active local database with the selected backup file.</p>
            </div>

            <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="restore-path">
              Backup file
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                id="restore-path"
                onChange={(event) => setRestorePath(event.target.value)}
                value={restorePath}
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <Button disabled={isWorking} onClick={handleChooseFile} type="button" variant="ghost">
                Choose backup file
              </Button>
              <Button disabled={isWorking || !restorePath.trim()} type="submit">
                Restore backup
              </Button>
            </div>

            {lastRestore ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
                Database restored at {formatDateTime(lastRestore.restoredAt)} from {lastRestore.restoredFrom}.
              </div>
            ) : null}
          </form>
        </>
      )}
    </div>
  );
}
