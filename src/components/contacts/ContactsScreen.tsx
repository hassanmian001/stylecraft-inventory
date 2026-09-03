import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ContactDto, ContactInput } from "@/types/stylecraft-api";

type ContactKind = "customers" | "suppliers";

type ContactFormState = {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

function makeEmptyForm(): ContactFormState {
  return {
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  };
}

function toFormState(contact: ContactDto): ContactFormState {
  return {
    name: contact.name,
    phone: contact.phone ?? "",
    email: contact.email ?? "",
    address: contact.address ?? "",
    notes: contact.notes ?? "",
  };
}

function buildContactInput(form: ContactFormState): { input?: ContactInput; error?: string } {
  const name = form.name.trim();

  if (!name) {
    return { error: "Contact name is required." };
  }

  return {
    input: {
      name,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    },
  };
}

function matchesSearch(contact: ContactDto, search: string) {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return [contact.name, contact.phone, contact.email, contact.address, contact.notes].some((value) =>
    (value ?? "").toLowerCase().includes(normalizedSearch),
  );
}

export default function ContactsScreen() {
  const [activeKind, setActiveKind] = useState<ContactKind>("customers");
  const [customers, setCustomers] = useState<ContactDto[]>([]);
  const [suppliers, setSuppliers] = useState<ContactDto[]>([]);
  const [form, setForm] = useState<ContactFormState>(() => makeEmptyForm());
  const [editingContact, setEditingContact] = useState<ContactDto | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadContacts() {
    setIsLoading(true);
    setError(null);

    try {
      const [loadedCustomers, loadedSuppliers] = await Promise.all([
        window.stylecraft.contacts.listCustomers(),
        window.stylecraft.contacts.listSuppliers(),
      ]);

      setCustomers(loadedCustomers);
      setSuppliers(loadedSuppliers);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load contacts.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadContacts();
  }, []);

  function resetForm() {
    setForm(makeEmptyForm());
    setEditingContact(null);
  }

  function selectKind(kind: ContactKind) {
    setActiveKind(kind);
    resetForm();
  }

  function startEditing(contact: ContactDto) {
    setEditingContact(contact);
    setForm(toFormState(contact));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const { input, error: validationError } = buildContactInput(form);

    if (!input) {
      setError(validationError ?? "Contact details are incomplete.");
      return;
    }

    try {
      if (activeKind === "customers") {
        if (editingContact) {
          await window.stylecraft.contacts.updateCustomer(editingContact.id, input);
        } else {
          await window.stylecraft.contacts.createCustomer(input);
        }
      } else if (editingContact) {
        await window.stylecraft.contacts.updateSupplier(editingContact.id, input);
      } else {
        await window.stylecraft.contacts.createSupplier(input);
      }

      resetForm();
      await loadContacts();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not save contact.");
    }
  }

  const activeContacts = activeKind === "customers" ? customers : suppliers;
  const filteredContacts = activeContacts.filter((contact) => matchesSearch(contact, search));
  const activeLabel = activeKind === "customers" ? "Customer" : "Supplier";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">Contact management</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">Customers & suppliers</h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Keep contact details available for repeat sales and supplier purchases without changing transaction history.
          </p>
        </div>
        <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <span className="font-semibold">{customers.length}</span> customers · <span className="font-semibold">{suppliers.length}</span> suppliers
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => selectKind("customers")} type="button" variant={activeKind === "customers" ? "default" : "ghost"}>
          Customers
        </Button>
        <Button onClick={() => selectKind("suppliers")} type="button" variant={activeKind === "suppliers" ? "default" : "ghost"}>
          Suppliers
        </Button>
      </div>

      <form className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" noValidate onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="font-semibold text-slate-950">{editingContact ? `Edit ${activeLabel.toLowerCase()}` : `Add ${activeLabel.toLowerCase()}`}</h3>
            <p className="mt-1 text-sm text-slate-500">Name is required. Other details are optional.</p>
          </div>
          {editingContact ? (
            <Button onClick={resetForm} type="button" variant="ghost">
              Cancel edit
            </Button>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="contact-name">
            Name
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              id="contact-name"
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              value={form.name}
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="contact-phone">
            Phone
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              id="contact-phone"
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              value={form.phone}
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="contact-email">
            Email
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              id="contact-email"
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              type="email"
              value={form.email}
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="contact-address">
            Address
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              id="contact-address"
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              value={form.address}
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="contact-notes">
          Notes
          <textarea
            className="min-h-20 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            id="contact-notes"
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            value={form.notes}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <Button disabled={isLoading} type="submit">
            {editingContact ? `Save ${activeLabel.toLowerCase()}` : `Add ${activeLabel.toLowerCase()}`}
          </Button>
        </div>
      </form>

      <div className="space-y-3">
        <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="contact-search">
          Search {activeKind}
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            id="contact-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, phone, email, address, or notes"
            value={search}
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h3 className="font-semibold text-slate-950">{activeKind === "customers" ? "Customer directory" : "Supplier directory"}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Address</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-5 text-slate-500" colSpan={6}>
                    Loading contacts...
                  </td>
                </tr>
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td className="px-4 py-5 text-slate-500" colSpan={6}>
                    No {activeKind} found.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr key={contact.id}>
                    <td className="px-4 py-4 font-medium text-slate-950">{contact.name}</td>
                    <td className="px-4 py-4 text-slate-600">{contact.phone ?? "-"}</td>
                    <td className="px-4 py-4 text-slate-600">{contact.email ?? "-"}</td>
                    <td className="px-4 py-4 text-slate-600">{contact.address ?? "-"}</td>
                    <td className="px-4 py-4 text-slate-600">{contact.notes ?? "-"}</td>
                    <td className="px-4 py-4">
                      <Button onClick={() => startEditing(contact)} type="button" variant="ghost">
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
