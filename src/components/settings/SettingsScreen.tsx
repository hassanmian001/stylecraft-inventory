import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { styleCraftEmail, styleCraftPhone } from "@/lib/branding";
import { useTheme } from "@/lib/use-theme";
import type { BackupResultDto, BackupSettingsDto, BusinessSettingsDto, EditPasswordStatusDto, RestoreResultDto, ThemePreference, UpdateCheckResult } from "@/types/stylecraft-api";

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

function describeUpdateCheckResult(result: UpdateCheckResult): string {
  switch (result.status) {
    case "dev-mode":
      return "Update checks are only available in the installed app, not while developing.";
    case "up-to-date":
      return `You're on the latest version (v${result.currentVersion}).`;
    case "update-available":
      return `Update v${result.version} found. It's downloading in the background — you'll be asked to restart once it's ready.`;
    case "already-downloaded":
      return `Update v${result.version} is ready. Check the dialog that just opened to restart and install.`;
    case "error":
      return `Could not check for updates: ${result.message}`;
  }
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
  const [updateCheckResult, setUpdateCheckResult] = useState<UpdateCheckResult | null>(null);
  const [isCheckingForUpdate, setIsCheckingForUpdate] = useState(false);
  const [editPasswordStatus, setEditPasswordStatus] = useState<EditPasswordStatusDto>({ isSet: false });
  const [currentEditPassword, setCurrentEditPassword] = useState("");
  const [newEditPassword, setNewEditPassword] = useState("");
  const [editPasswordNotice, setEditPasswordNotice] = useState<string | null>(null);
  const [editPasswordError, setEditPasswordError] = useState<string | null>(null);
  const { preference: themePreference, setPreference: setThemePreference } = useTheme();

  async function loadSettings() {
    setIsLoading(true);
    setError(null);

    try {
      const [loadedBackupSettings, loadedBusinessSettings, loadedEditPasswordStatus] = await Promise.all([
        window.stylecraft.backup.getSettings(),
        window.stylecraft.settings.getBusinessSettings(),
        window.stylecraft.security.getEditPasswordStatus(),
      ]);

      setBackupSettings(loadedBackupSettings);
      setBusinessSettings(loadedBusinessSettings);
      setEditPasswordStatus(loadedEditPasswordStatus);
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

  async function handleSaveEditPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEditPasswordError(null);
    setEditPasswordNotice(null);

    try {
      setEditPasswordStatus(await window.stylecraft.security.setEditPassword(newEditPassword, editPasswordStatus.isSet ? currentEditPassword : null));
      setCurrentEditPassword("");
      setNewEditPassword("");
      setEditPasswordNotice("Edit password saved. Changing a recorded sale now asks for it.");
    } catch (caughtError) {
      setEditPasswordError(caughtError instanceof Error ? caughtError.message : "Could not save the edit password.");
    }
  }

  async function handleClearEditPassword() {
    setEditPasswordError(null);
    setEditPasswordNotice(null);

    try {
      setEditPasswordStatus(await window.stylecraft.security.clearEditPassword(currentEditPassword));
      setCurrentEditPassword("");
      setNewEditPassword("");
      setEditPasswordNotice("Edit password removed. Recorded sales can now be changed without one.");
    } catch (caughtError) {
      setEditPasswordError(caughtError instanceof Error ? caughtError.message : "Could not remove the edit password.");
    }
  }

  async function handleCheckForUpdates() {
    setUpdateCheckResult(null);
    setIsCheckingForUpdate(true);

    try {
      setUpdateCheckResult(await window.stylecraft.update.check());
    } catch (caughtError) {
      setUpdateCheckResult({
        status: "error",
        message: caughtError instanceof Error ? caughtError.message : "Could not check for updates.",
      });
    } finally {
      setIsCheckingForUpdate(false);
    }
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
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Milestone 9 backup and restore</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">Settings</h2>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">Choose where database backups are saved, create manual backups, and restore from a saved SQLite backup file.</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300" role="alert">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <h3 className="font-semibold text-slate-950 dark:text-slate-50">Appearance</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Dark mode is easier on the eyes in a dim shop. &quot;Match Windows&quot; follows the system setting.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["light", "dark", "system"] as ThemePreference[]).map((option) => (
            <Button
              key={option}
              onClick={() => setThemePreference(option)}
              size="sm"
              type="button"
              variant={themePreference === option ? "default" : "ghost"}
            >
              {option === "light" ? "Light" : option === "dark" ? "Dark" : "Match Windows"}
            </Button>
          ))}
        </div>
      </section>

      <form className="grid gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm" noValidate onSubmit={handleSaveEditPassword}>
        <div>
          <h3 className="font-semibold text-slate-950 dark:text-slate-50">Sale edit password</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {editPasswordStatus.isSet
              ? "A password is set. Changing a recorded sale asks for it first."
              : "No password is set, so anyone using this computer can change a recorded sale."}
          </p>
        </div>

        {editPasswordError ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300" role="alert">
            {editPasswordError}
          </div>
        ) : null}

        {editPasswordNotice ? (
          <div className="rounded-2xl border border-green-200 dark:border-green-800/60 bg-green-50 dark:bg-green-950/30 px-4 py-3 text-sm text-green-800 dark:text-green-200" role="status">
            {editPasswordNotice}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {editPasswordStatus.isSet ? (
            <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="current-edit-password">
              Current password
              <input className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-950 dark:text-slate-50 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50" id="current-edit-password" onChange={(event) => setCurrentEditPassword(event.target.value)} type="password" value={currentEditPassword} />
            </label>
          ) : null}
          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="new-edit-password">
            {editPasswordStatus.isSet ? "New password" : "Password"}
            <input className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-950 dark:text-slate-50 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50" id="new-edit-password" onChange={(event) => setNewEditPassword(event.target.value)} type="password" value={newEditPassword} />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit">{editPasswordStatus.isSet ? "Change password" : "Set password"}</Button>
          {editPasswordStatus.isSet ? (
            <Button onClick={handleClearEditPassword} type="button" variant="ghost">
              Remove password
            </Button>
          ) : null}
        </div>
      </form>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="font-semibold text-slate-950 dark:text-slate-50">Software updates</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">The app checks for updates automatically. Use this if you don't want to wait.</p>
          </div>
          <Button disabled={isCheckingForUpdate} onClick={handleCheckForUpdates} type="button" variant="ghost">
            {isCheckingForUpdate ? "Checking..." : "Check for updates"}
          </Button>
        </div>
        {updateCheckResult ? (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              updateCheckResult.status === "error"
                ? "border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"
                : "border-green-200 dark:border-green-800/60 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200"
            }`}
            role="status"
          >
            {describeUpdateCheckResult(updateCheckResult)}
          </div>
        ) : null}
      </section>

      {isLoading || backupSettings === null || businessSettings === null ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-5 text-sm text-slate-500 dark:text-slate-400">Loading settings...</div>
      ) : (
        <>
          <form className="grid gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4" noValidate onSubmit={handleSaveBusinessSettings}>
            <div>
              <h3 className="font-semibold text-slate-950 dark:text-slate-50">Business profile</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">These details appear on invoices and printable documents.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="business-name">
                Business name
                <input
                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-950 dark:text-slate-50 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  id="business-name"
                  onChange={(event) => updateBusinessForm({ businessName: event.target.value })}
                  value={businessForm.businessName}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="business-phone">
                Phone
                <input
                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-950 dark:text-slate-50 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  id="business-phone"
                  onChange={(event) => updateBusinessForm({ phone: event.target.value })}
                  value={businessForm.phone ?? ""}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="business-email">
                Email
                <input
                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-950 dark:text-slate-50 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  id="business-email"
                  onChange={(event) => updateBusinessForm({ email: event.target.value })}
                  value={businessForm.email ?? ""}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="currency-symbol">
                Currency symbol
                <input
                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-950 dark:text-slate-50 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  id="currency-symbol"
                  onChange={(event) => updateBusinessForm({ currencySymbol: event.target.value })}
                  value={businessForm.currencySymbol}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2" htmlFor="business-address">
                Address
                <textarea
                  className="min-h-20 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-950 dark:text-slate-50 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  id="business-address"
                  onChange={(event) => updateBusinessForm({ address: event.target.value })}
                  value={businessForm.address ?? ""}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="invoice-prefix">
                Invoice prefix
                <input
                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-950 dark:text-slate-50 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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

          <form className="grid gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4" noValidate onSubmit={handleSaveLocation}>
            <div>
              <h3 className="font-semibold text-slate-950 dark:text-slate-50">Backup location</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Current location: {backupSettings.backupLocation}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{backupSettings.isDefaultLocation ? "Using the default local backup folder." : "Using a saved custom backup folder."}</p>
            </div>

            <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="backup-location">
              Backup folder
              <input
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-950 dark:text-slate-50 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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

          <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="font-semibold text-slate-950 dark:text-slate-50">Create manual backup</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Backup filenames include date and time, and existing backup files are not overwritten.</p>
              </div>
              <Button disabled={isWorking} onClick={handleCreateBackup} type="button">
                Create backup
              </Button>
            </div>
            {lastBackup ? (
              <div className="mt-4 rounded-2xl border border-green-200 dark:border-green-800/60 bg-green-50 dark:bg-green-950/30 px-4 py-3 text-sm text-green-800 dark:text-green-200" role="status">
                Backup created at {formatDateTime(lastBackup.createdAt)}: {lastBackup.backupPath}
              </div>
            ) : null}
          </section>

          <form className="grid gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm" noValidate onSubmit={handleRestore}>
            <div>
              <h3 className="font-semibold text-slate-950 dark:text-slate-50">Restore from backup</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Restoring replaces the active local database with the selected backup file.</p>
            </div>

            <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="restore-path">
              Backup file
              <input
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-950 dark:text-slate-50 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
              <div className="rounded-2xl border border-green-200 dark:border-green-800/60 bg-green-50 dark:bg-green-950/30 px-4 py-3 text-sm text-green-800 dark:text-green-200" role="status">
                Database restored at {formatDateTime(lastRestore.restoredAt)} from {lastRestore.restoredFrom}.
              </div>
            ) : null}
          </form>
        </>
      )}
    </div>
  );
}
