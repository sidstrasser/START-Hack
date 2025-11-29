'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { ExtractedData } from '@/lib/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorAlert } from '@/components/ErrorAlert';

export default function NegotiationInput() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);

  // Form fields
  const [supplier, setSupplier] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [validityPeriod, setValidityPeriod] = useState('');
  const [goals, setGoals] = useState('');

  useEffect(() => {
    // Load extracted data if available
    const storedDocId = sessionStorage.getItem('documentId');
    const storedData = sessionStorage.getItem('extractedData');

    if (storedDocId && storedData) {
      setDocumentId(storedDocId);
      try {
        const data: ExtractedData = JSON.parse(storedData);
        setSupplier(data.supplier || '');
        setTotalPrice(data.total_price || '');
        setDeliveryTime(data.delivery_time || '');
        setContactPerson(data.contact_person || '');
        setPaymentTerms(data.payment_terms || '');
        setValidityPeriod(data.validity_period || '');
      } catch (e) {
        console.error('Failed to parse extracted data', e);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!documentId) {
      setError('No document uploaded. Please upload a document first or go back.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.generateBriefing({
        document_id: documentId,
        additional_context: {
          goals,
          supplier,
          total_price: totalPrice,
          delivery_time: deliveryTime,
          contact_person: contactPerson,
          payment_terms: paymentTerms,
          validity_period: validityPeriod,
        },
      });

      // Store job_id for briefing page
      sessionStorage.setItem('jobId', response.job_id);
      router.push('/briefing');
    } catch (err: any) {
      setError(err.message || 'Failed to generate briefing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-4xl font-bold mb-8 text-center">Negotiation Details</h1>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier Name
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter supplier name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Price
              </label>
              <input
                type="text"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., $10,000 USD"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Time
              </label>
              <input
                type="text"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 4-6 weeks"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Person
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter contact name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Terms
              </label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Net 30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Validity Period
              </label>
              <input
                type="text"
                value={validityPeriod}
                onChange={(e) => setValidityPeriod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 30 days"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Negotiation Goals (Optional)
            </label>
            <textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What do you want to achieve in this negotiation? (e.g., 10% price reduction, faster delivery)"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !documentId}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <LoadingSpinner size="sm" />}
            {loading ? 'Generating Briefing...' : 'Generate Briefing'}
          </button>
        </form>
      </div>
    </main>
  );
}
