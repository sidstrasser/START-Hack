"use client";

import { useState, useEffect } from "react";

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface HubSpotContact {
  id: string;
  name: string;
  email?: string;
  company?: string;
}

interface HubSpotExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: string;
  nextActions: string[];
  completedActions: string[];
  callDuration: number;
  finalMetrics: { value: number; risk: number; outcome: number };
}

export default function HubSpotExportModal({
  isOpen,
  onClose,
  summary,
  nextActions,
  completedActions,
  callDuration,
  finalMetrics,
}: HubSpotExportModalProps) {
  const [contacts, setContacts] = useState<HubSpotContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<HubSpotContact | null>(null);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchContacts();
    }
  }, [isOpen]);

  const fetchContacts = async (search?: string) => {
    setIsLoadingContacts(true);
    try {
      const url = search 
        ? `${BACKEND_API_URL}/api/hubspot/contacts?search=${encodeURIComponent(search)}`
        : `${BACKEND_API_URL}/api/hubspot/contacts`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts);
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleExport = async () => {
    if (!selectedContact) return;
    
    setIsExporting(true);
    setExportSuccess(null);
    
    try {
      const response = await fetch(`${BACKEND_API_URL}/api/hubspot/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedContact.id,
          summary,
          nextActions,
          completedActions,
          callDuration,
          metrics: finalMetrics
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setExportSuccess(data.message);
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        const error = await response.text();
        alert(`Export failed: ${error}`);
      }
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export to HubSpot");
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    setSelectedContact(null);
    setExportSuccess(null);
    setSearchQuery("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#FF7A59] to-[#FF957A]">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.15 7.35V4.68c.86-.43 1.45-1.32 1.45-2.35C19.6 1.05 18.55 0 17.27 0c-1.28 0-2.32 1.05-2.32 2.33 0 1.03.59 1.92 1.45 2.35v2.67c-1.16.28-2.18.88-2.96 1.72l-8.13-6.33c.05-.21.08-.43.08-.66C5.39.93 4.46 0 3.31 0 2.16 0 1.23.93 1.23 2.08s.93 2.08 2.08 2.08c.5 0 .95-.18 1.31-.47l7.94 6.19c-.52.84-.83 1.83-.83 2.89 0 1.05.31 2.04.83 2.88l-2.54 2.54c-.26-.09-.54-.14-.83-.14-1.52 0-2.76 1.24-2.76 2.76S7.67 24 9.19 24s2.76-1.24 2.76-2.76c0-.29-.05-.56-.14-.82l2.54-2.55c.84.52 1.84.83 2.92.83 2.99 0 5.42-2.43 5.42-5.42 0-2.99-2.43-5.42-5.42-5.42-.4 0-.79.05-1.17.14l.05-.01zm-.88 8.28c-1.65 0-2.99-1.34-2.99-2.99s1.34-2.99 2.99-2.99 2.99 1.34 2.99 2.99-1.34 2.99-2.99 2.99z"/>
            </svg>
            <div>
              <h3 className="text-lg font-bold text-white">Export to HubSpot</h3>
              <p className="text-sm text-white/80">Select a contact to attach the summary</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-white/80 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {exportSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Export Successful!</h4>
              <p className="text-gray-600">{exportSuccess}</p>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      clearTimeout((window as unknown as { searchTimeout?: NodeJS.Timeout }).searchTimeout);
                      (window as unknown as { searchTimeout?: NodeJS.Timeout }).searchTimeout = setTimeout(() => {
                        fetchContacts(e.target.value || undefined);
                      }, 300);
                    }}
                    className="w-full px-4 py-3 pl-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF7A59] focus:border-transparent outline-none"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Contacts List */}
              <div className="space-y-2 mb-6">
                {isLoadingContacts ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#FF7A59] border-t-transparent"></div>
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No contacts found</div>
                ) : (
                  contacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        selectedContact?.id === contact.id
                          ? "border-[#FF7A59] bg-orange-50 ring-2 ring-[#FF7A59]/20"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF7A59] to-[#FF957A] flex items-center justify-center text-white font-semibold">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{contact.name}</p>
                        <p className="text-sm text-gray-500 truncate">
                          {contact.email || contact.company || "No email"}
                        </p>
                      </div>
                      {selectedContact?.id === contact.id && (
                        <svg className="w-5 h-5 text-[#FF7A59]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                        </svg>
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Preview */}
              {selectedContact && (
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Will create:</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      1 Note with call summary
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {nextActions.length} Tasks for follow-up
                    </li>
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!exportSuccess && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={!selectedContact || isExporting}
              className="px-6 py-2 bg-[#FF7A59] text-white rounded-lg font-medium hover:bg-[#E56B4A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Export to HubSpot
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

