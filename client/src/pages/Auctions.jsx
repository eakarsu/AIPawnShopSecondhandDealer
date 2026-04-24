import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import DetailPanel from '../components/DetailPanel';
import { Gavel, Search, Plus, Calendar, DollarSign, Package, RefreshCw, CheckCircle, Tag } from 'lucide-react';

const AUCTION_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'];

const STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-700',
};

const STATUS_LABELS = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const AUCTION_TYPES = ['liquidation', 'public_auction', 'online_auction'];

const AUCTION_TYPE_LABELS = {
  liquidation: 'Liquidation',
  public_auction: 'Public Auction',
  online_auction: 'Online Auction',
};

const EMPTY_FORM = {
  auction_name: '',
  auction_date: new Date().toISOString().split('T')[0],
  auction_type: 'public_auction',
  notes: '',
};

const EMPTY_EDIT_FORM = {
  auction_name: '',
  auction_date: '',
  auction_type: '',
  notes: '',
  status: '',
};

const EMPTY_ITEM_FORM = {
  inventory_id: '',
  starting_bid: '',
};

const EMPTY_BID_FORM = {
  winning_bid: '',
  winner_name: '',
};

function formatCurrency(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return '$0.00';
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-900 break-words">{value || '-'}</p>
      </div>
    </div>
  );
}

export default function Auctions() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedAuction, setSelectedAuction] = useState(null);
  const [auctionItems, setAuctionItems] = useState([]);
  const [detailOpen, setDetailOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ ...EMPTY_EDIT_FORM });
  const [editSaving, setEditSaving] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [auctionToDelete, setAuctionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Add Item modal
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ ...EMPTY_ITEM_FORM });
  const [itemSaving, setItemSaving] = useState(false);
  const [availableInventory, setAvailableInventory] = useState([]);

  // Update Bid modal
  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [bidForm, setBidForm] = useState({ ...EMPTY_BID_FORM });
  const [bidSaving, setBidSaving] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Completing auction
  const [completing, setCompleting] = useState(false);

  // Fetch auctions
  const fetchAuctions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      const { data } = await api.get('/auctions', { params });
      setAuctions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch auctions error:', err);
      toast.error('Failed to load auctions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchAuctions();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, statusFilter]);

  // Fetch auction items
  const fetchAuctionItems = async (auctionId) => {
    try {
      const { data } = await api.get(`/auctions/${auctionId}/items`);
      setAuctionItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch auction items error:', err);
      setAuctionItems([]);
    }
  };

  // Fetch available inventory for add-item dropdown
  const fetchAvailableInventory = async () => {
    try {
      const { data } = await api.get('/inventory', { params: { status: 'available' } });
      const available = Array.isArray(data) ? data : [];
      // Also try to fetch defaulted items
      try {
        const { data: defaulted } = await api.get('/inventory', { params: { status: 'defaulted' } });
        const defaultedItems = Array.isArray(defaulted) ? defaulted : [];
        setAvailableInventory([...available, ...defaultedItems]);
      } catch {
        setAvailableInventory(available);
      }
    } catch (err) {
      console.error('Fetch inventory error:', err);
      setAvailableInventory([]);
    }
  };

  // Row click -> detail
  const handleRowClick = async (auction) => {
    try {
      const { data } = await api.get(`/auctions/${auction.id}`);
      setSelectedAuction(data);
      await fetchAuctionItems(auction.id);
      setDetailOpen(true);
    } catch (err) {
      console.error('Fetch auction detail error:', err);
      toast.error('Failed to load auction details');
    }
  };

  // --- Create Auction ---
  const openAddModal = () => {
    setForm({
      ...EMPTY_FORM,
      auction_date: new Date().toISOString().split('T')[0],
    });
    setModalOpen(true);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateAuction = async (e) => {
    e.preventDefault();
    if (!form.auction_name.trim()) {
      toast.error('Please enter an auction name');
      return;
    }
    if (!form.auction_date) {
      toast.error('Please select a date');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        auction_name: form.auction_name.trim(),
        auction_date: form.auction_date,
        auction_type: form.auction_type,
        notes: form.notes || null,
      };
      await api.post('/auctions', payload);
      toast.success('Auction created successfully');
      setModalOpen(false);
      setForm({ ...EMPTY_FORM });
      fetchAuctions();
    } catch (err) {
      console.error('Create auction error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to create auction';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // --- Edit Auction ---
  const openEditModal = () => {
    if (!selectedAuction) return;
    setEditForm({
      auction_name: selectedAuction.auction_name || '',
      auction_date: selectedAuction.auction_date ? selectedAuction.auction_date.split('T')[0] : '',
      auction_type: selectedAuction.auction_type || 'public_auction',
      notes: selectedAuction.notes || '',
      status: selectedAuction.status || 'scheduled',
    });
    setDetailOpen(false);
    setEditModalOpen(true);
  };

  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateAuction = async (e) => {
    e.preventDefault();
    if (!selectedAuction) return;
    if (!editForm.auction_name.trim()) {
      toast.error('Please enter an auction name');
      return;
    }
    setEditSaving(true);
    try {
      const payload = {
        auction_name: editForm.auction_name.trim(),
        auction_date: editForm.auction_date,
        auction_type: editForm.auction_type,
        notes: editForm.notes || null,
        status: editForm.status,
      };
      await api.put(`/auctions/${selectedAuction.id}`, payload);
      toast.success('Auction updated successfully');
      setEditModalOpen(false);
      setSelectedAuction(null);
      fetchAuctions();
    } catch (err) {
      console.error('Update auction error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to update auction';
      toast.error(message);
    } finally {
      setEditSaving(false);
    }
  };

  // --- Delete Auction ---
  const openDeleteModal = () => {
    if (!selectedAuction) return;
    setAuctionToDelete(selectedAuction);
    setDetailOpen(false);
    setDeleteModalOpen(true);
  };

  const handleDeleteAuction = async () => {
    if (!auctionToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/auctions/${auctionToDelete.id}`);
      toast.success('Auction deleted successfully');
      setDeleteModalOpen(false);
      setAuctionToDelete(null);
      setSelectedAuction(null);
      fetchAuctions();
    } catch (err) {
      console.error('Delete auction error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to delete auction';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  // --- Add Item to Auction ---
  const openAddItemModal = () => {
    setItemForm({ ...EMPTY_ITEM_FORM });
    fetchAvailableInventory();
    setAddItemModalOpen(true);
  };

  const handleItemFormChange = (field, value) => {
    setItemForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!selectedAuction) return;
    if (!itemForm.inventory_id) {
      toast.error('Please select an inventory item');
      return;
    }
    if (!itemForm.starting_bid || parseFloat(itemForm.starting_bid) <= 0) {
      toast.error('Starting bid must be greater than 0');
      return;
    }
    setItemSaving(true);
    try {
      const payload = {
        inventory_id: parseInt(itemForm.inventory_id, 10),
        starting_bid: parseFloat(itemForm.starting_bid),
      };
      await api.post(`/auctions/${selectedAuction.id}/items`, payload);
      toast.success('Item added to auction');
      setAddItemModalOpen(false);
      setItemForm({ ...EMPTY_ITEM_FORM });
      await fetchAuctionItems(selectedAuction.id);
    } catch (err) {
      console.error('Add auction item error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to add item';
      toast.error(message);
    } finally {
      setItemSaving(false);
    }
  };

  // --- Update Bid ---
  const openBidModal = (item) => {
    setSelectedItem(item);
    setBidForm({
      winning_bid: item.winning_bid || '',
      winner_name: item.winner_name || '',
    });
    setBidModalOpen(true);
  };

  const handleBidFormChange = (field, value) => {
    setBidForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateBid = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    setBidSaving(true);
    try {
      const payload = {
        winning_bid: bidForm.winning_bid ? parseFloat(bidForm.winning_bid) : null,
        winner_name: bidForm.winner_name || null,
      };
      await api.put(`/auctions/items/${selectedItem.id}`, payload);
      toast.success('Bid updated successfully');
      setBidModalOpen(false);
      setSelectedItem(null);
      setBidForm({ ...EMPTY_BID_FORM });
      if (selectedAuction) {
        await fetchAuctionItems(selectedAuction.id);
      }
    } catch (err) {
      console.error('Update bid error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to update bid';
      toast.error(message);
    } finally {
      setBidSaving(false);
    }
  };

  // --- Complete Auction ---
  const handleCompleteAuction = async () => {
    if (!selectedAuction) return;
    setCompleting(true);
    try {
      await api.post(`/auctions/${selectedAuction.id}/complete`);
      toast.success('Auction completed successfully');
      setDetailOpen(false);
      setSelectedAuction(null);
      fetchAuctions();
    } catch (err) {
      console.error('Complete auction error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to complete auction';
      toast.error(message);
    } finally {
      setCompleting(false);
    }
  };

  // Filtered auctions
  const filteredAuctions = auctions;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 rounded-xl">
            <Gavel className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Auctions & Liquidation</h1>
            <p className="text-sm text-gray-500">
              {auctions.length} total auction{auctions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-lg shadow-md shadow-amber-500/25 transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          New Auction
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search auctions..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
            >
              <span className="text-xs font-bold">&times;</span>
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
        >
          <option value="all">All Statuses</option>
          {AUCTION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">ID</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Auction Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600"># Items</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
                      <span className="text-sm text-gray-500">Loading auctions...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAuctions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Gavel className="w-8 h-8 text-gray-300" />
                      <p className="text-sm text-gray-500">No auctions found</p>
                      <button
                        onClick={openAddModal}
                        className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                      >
                        Create your first auction
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAuctions.map((auction) => (
                  <tr
                    key={auction.id}
                    onClick={() => handleRowClick(auction)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                      {auction.id}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {auction.auction_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(auction.auction_date)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {AUCTION_TYPE_LABELS[auction.auction_type] || auction.auction_type || '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 font-medium">
                      {auction.item_count ?? auction.items_count ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={auction.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      <DetailPanel
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selectedAuction ? `Auction: ${selectedAuction.auction_name}` : 'Auction Details'}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
      >
        {selectedAuction && (
          <div className="space-y-6">
            {/* Auction ID + Status */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Auction ID</p>
                <p className="text-lg font-bold text-gray-900 font-mono">
                  {selectedAuction.id}
                </p>
              </div>
              <StatusBadge status={selectedAuction.status} />
            </div>

            {/* Auction Details */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Auction Details
              </h3>
              <div className="space-y-3">
                <DetailRow
                  icon={<Gavel className="w-4 h-4 text-gray-400" />}
                  label="Auction Name"
                  value={selectedAuction.auction_name}
                />
                <DetailRow
                  icon={<Calendar className="w-4 h-4 text-gray-400" />}
                  label="Auction Date"
                  value={formatDate(selectedAuction.auction_date)}
                />
                <DetailRow
                  icon={<Tag className="w-4 h-4 text-gray-400" />}
                  label="Type"
                  value={AUCTION_TYPE_LABELS[selectedAuction.auction_type] || selectedAuction.auction_type}
                />
                <DetailRow
                  icon={<Package className="w-4 h-4 text-gray-400" />}
                  label="Status"
                  value={STATUS_LABELS[selectedAuction.status] || selectedAuction.status}
                />
                {selectedAuction.notes && (
                  <DetailRow
                    icon={<Tag className="w-4 h-4 text-gray-400" />}
                    label="Notes"
                    value={selectedAuction.notes}
                  />
                )}
              </div>
            </div>

            {/* Complete Auction Button */}
            {['scheduled', 'in_progress'].includes(selectedAuction.status) && (
              <button
                onClick={handleCompleteAuction}
                disabled={completing}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                {completing ? 'Completing...' : 'Complete Auction'}
              </button>
            )}

            {/* Items List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Auction Items ({auctionItems.length})
                </h3>
                <button
                  onClick={openAddItemModal}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Item
                </button>
              </div>

              {auctionItems.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">
                  No items in this auction yet.
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-3 py-2 font-semibold text-gray-600">Item Name</th>
                          <th className="text-right px-3 py-2 font-semibold text-gray-600">Starting Bid</th>
                          <th className="text-right px-3 py-2 font-semibold text-gray-600">Winning Bid</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-600">Winner</th>
                          <th className="text-center px-3 py-2 font-semibold text-gray-600">Status</th>
                          <th className="text-center px-3 py-2 font-semibold text-gray-600">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {auctionItems.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-900 font-medium">
                              {item.item_name || item.inventory?.item_name || item.inventory?.description || `Item #${item.inventory_id || item.id}`}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700">
                              {formatCurrency(item.starting_bid)}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700">
                              {item.winning_bid ? formatCurrency(item.winning_bid) : '-'}
                            </td>
                            <td className="px-3 py-2 text-gray-700">
                              {item.winner_name || '-'}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                item.status === 'sold' ? 'bg-green-100 text-green-700' :
                                item.status === 'unsold' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {item.status || 'pending'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openBidModal(item);
                                }}
                                className="inline-flex items-center px-2 py-1 text-[10px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                              >
                                Update Bid
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DetailPanel>

      {/* New Auction Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Auction" size="lg">
        <form onSubmit={handleCreateAuction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Auction Name *</label>
            <input
              type="text"
              value={form.auction_name}
              onChange={(e) => handleFormChange('auction_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
              placeholder="Enter auction name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Auction Date *</label>
            <input
              type="date"
              value={form.auction_date}
              onChange={(e) => handleFormChange('auction_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Auction Type *</label>
            <select
              value={form.auction_type}
              onChange={(e) => handleFormChange('auction_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
            >
              {AUCTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {AUCTION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleFormChange('notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
              rows={3}
              placeholder="Optional notes..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 rounded-lg transition-colors"
            >
              {saving ? 'Creating...' : 'Create Auction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Auction Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Auction" size="lg">
        <form onSubmit={handleUpdateAuction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Auction Name *</label>
            <input
              type="text"
              value={editForm.auction_name}
              onChange={(e) => handleEditFormChange('auction_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
              placeholder="Enter auction name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Auction Date *</label>
            <input
              type="date"
              value={editForm.auction_date}
              onChange={(e) => handleEditFormChange('auction_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Auction Type *</label>
            <select
              value={editForm.auction_type}
              onChange={(e) => handleEditFormChange('auction_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
            >
              {AUCTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {AUCTION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={editForm.status}
              onChange={(e) => handleEditFormChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
            >
              {AUCTION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={editForm.notes}
              onChange={(e) => handleEditFormChange('notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
              rows={3}
              placeholder="Optional notes..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSaving}
              className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 rounded-lg transition-colors"
            >
              {editSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Auction" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete auction{' '}
            <span className="font-semibold text-gray-900">
              {auctionToDelete?.auction_name || `#${auctionToDelete?.id}`}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAuction}
              disabled={deleting}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:bg-red-300 rounded-lg transition-colors"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Item Modal */}
      <Modal isOpen={addItemModalOpen} onClose={() => setAddItemModalOpen(false)} title="Add Item to Auction" size="md">
        <form onSubmit={handleAddItem} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Inventory Item *</label>
            <select
              value={itemForm.inventory_id}
              onChange={(e) => handleItemFormChange('inventory_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
              required
            >
              <option value="">Select an item...</option>
              {availableInventory.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  #{inv.id} - {inv.item_name || inv.description || 'Unnamed Item'} ({inv.status})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Starting Bid *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={itemForm.starting_bid}
                onChange={(e) => handleItemFormChange('starting_bid', e.target.value)}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                placeholder="0.00"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setAddItemModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={itemSaving}
              className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 rounded-lg transition-colors"
            >
              {itemSaving ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Update Bid Modal */}
      <Modal isOpen={bidModalOpen} onClose={() => setBidModalOpen(false)} title="Update Bid" size="sm">
        <form onSubmit={handleUpdateBid} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Winning Bid</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={bidForm.winning_bid}
                onChange={(e) => handleBidFormChange('winning_bid', e.target.value)}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Winner Name</label>
            <input
              type="text"
              value={bidForm.winner_name}
              onChange={(e) => handleBidFormChange('winner_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
              placeholder="Enter winner's name"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setBidModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={bidSaving}
              className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 rounded-lg transition-colors"
            >
              {bidSaving ? 'Updating...' : 'Update Bid'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
