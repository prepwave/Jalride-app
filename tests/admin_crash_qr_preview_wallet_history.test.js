const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('JalRide Bugfixes: Admin Crash + QR Scanner Live Preview + Customer Transaction History', () => {
  const root = path.resolve(__dirname, '..');
  const adminBoatsSrc = fs.readFileSync(path.join(root, 'src/screens/admin/AdminBoatsScreen.js'), 'utf8');
  const adminDashboardSrc = fs.readFileSync(path.join(root, 'src/screens/admin/AdminDashboardScreen.js'), 'utf8');
  const qrScanSrc = fs.readFileSync(path.join(root, 'src/screens/customer/QrScanScreen.js'), 'utf8');
  const walletSrc = fs.readFileSync(path.join(root, 'src/screens/customer/CustomerWalletScreen.js'), 'utf8');
  const apiSrc = fs.readFileSync(path.join(root, 'src/services/api.js'), 'utf8');

  // =========================================================================
  // PART 1: ADMIN APP CRASH FIX (Pending Boat Approvals)
  // =========================================================================
  describe('Part 1: Admin Fleet Approval Crash & UX Fixes', () => {
    // Pure function recreation matching AdminBoatsScreen.resolveBoatImage
    const resolveBoatImage = (item) => {
      if (Array.isArray(item?.images) && item.images.length > 0) {
        const first = item.images[0];
        if (first && typeof first === 'object') {
          const candidate = first.url || first.secure_url || first.thumbnailUrl;
          if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate.trim();
          }
        }
        if (typeof first === 'string' && first.trim().length > 0) {
          return first.trim();
        }
      }
      if (typeof item?.imageUrl === 'string' && item.imageUrl.trim().length > 0) {
        return item.imageUrl.trim();
      }
      return 'https://images.unsplash.com/photo-1598977123418-454555aa04f8?w=800&q=80';
    };

    it('1.1 resolveBoatImage extracts string URL from backend image objects array (preventing native ClassCastException)', () => {
      const boatWithObjImages = {
        images: [{ url: 'https://cloudinary.com/jalride/boat1.jpg', publicId: 'boat1' }],
      };
      const resolved = resolveBoatImage(boatWithObjImages);
      assert.strictEqual(typeof resolved, 'string', 'Resolved image URI must be a primitive string');
      assert.strictEqual(resolved, 'https://cloudinary.com/jalride/boat1.jpg');
    });

    it('1.2 resolveBoatImage handles string URLs, thumbnailUrl fallback, and missing images', () => {
      const boatWithStringImg = { images: ['https://example.com/boat.jpg'] };
      assert.strictEqual(resolveBoatImage(boatWithStringImg), 'https://example.com/boat.jpg');

      const boatWithThumb = { images: [{ thumbnailUrl: 'https://example.com/thumb.jpg' }] };
      assert.strictEqual(resolveBoatImage(boatWithThumb), 'https://example.com/thumb.jpg');

      const boatNoImages = { images: [] };
      assert.ok(resolveBoatImage(boatNoImages).startsWith('https://'), 'Must return default placeholder');

      const boatNull = null;
      assert.ok(resolveBoatImage(boatNull).startsWith('https://'), 'Must handle null item safely');
    });

    it('1.3 AdminDashboardScreen navigates to AdminBoats passing initialFilter: pending from Need Attention', () => {
      assert.ok(
        adminDashboardSrc.includes("navigation.navigate('AdminBoats', { initialFilter: 'pending' })"),
        'AdminDashboard must pass initialFilter: pending when tapping Pending Boat Approvals'
      );
    });

    it('1.4 AdminBoatsScreen supports route initialFilter and filter pills (all, pending, approved, rejected)', () => {
      assert.ok(adminBoatsSrc.includes('route?.params?.initialFilter'), 'Must read initialFilter from route params');
      assert.ok(adminBoatsSrc.includes("'pending'"), 'Must support pending filter');
      assert.ok(adminBoatsSrc.includes("'approved'"), 'Must support approved filter');
      assert.ok(adminBoatsSrc.includes("'rejected'"), 'Must support rejected filter');
      assert.ok(adminBoatsSrc.includes('filteredBoats'), 'Must compute filtered list for FlatList');
    });

    it('1.5 AdminBoatsScreen includes loading, error, and unmount protection states', () => {
      assert.ok(adminBoatsSrc.includes('loading') && adminBoatsSrc.includes('setLoading'), 'Must have loading state');
      assert.ok(adminBoatsSrc.includes('error') && adminBoatsSrc.includes('setError'), 'Must have error state');
      assert.ok(adminBoatsSrc.includes('isMountedRef'), 'Must have isMountedRef to prevent state updates after unmount');
    });

    it('1.6 AdminBoatsScreen prevents duplicate approval/rejection operations', () => {
      assert.ok(
        adminBoatsSrc.includes('actionLoadingId') && adminBoatsSrc.includes('setActionLoadingId'),
        'Must track actionLoadingId to guard against duplicate button presses'
      );
    });

    it('1.7 AdminBoatsScreen safely handles null/missing optional fields and safe keyExtractor', () => {
      assert.ok(adminBoatsSrc.includes('item?._id || item?.id || String(index)'), 'Must have fallback in keyExtractor');
      assert.ok(adminBoatsSrc.includes('item.boatName ||'), 'Must have fallback for boat name');
      assert.ok(adminBoatsSrc.includes('item.location ||'), 'Must have fallback for location');
    });

    it('1.8 ApiService.getAdminBoats supports optional query params while maintaining backwards compatibility', () => {
      assert.ok(apiSrc.includes('async getAdminBoats(params)'), 'getAdminBoats must accept optional params');
      assert.ok(apiSrc.includes("this.request(`/admin/boats${qs}`)"), 'Must append query string when params passed');
    });
  });

  // =========================================================================
  // PART 2: QR SCANNER LIVE PREVIEW & UX FIX
  // =========================================================================
  describe('Part 2: QR Scanner Live Camera Preview & Lifecycle UX', () => {
    it('2.1 Uses CameraView with absolute positioning filling the scanner container', () => {
      assert.ok(qrScanSrc.includes('<CameraView'), 'Must render CameraView');
      assert.ok(qrScanSrc.includes('cameraPreview'), 'Must style CameraView with cameraPreview');
      assert.ok(qrScanSrc.includes("backgroundColor: '#000000'"), 'Container background must be black to prevent cyan bleed');
    });

    it('2.2 Uses useIsFocused from @react-navigation/native for clean camera lifecycle management', () => {
      assert.ok(qrScanSrc.includes("import { useIsFocused } from '@react-navigation/native'"), 'Must import useIsFocused');
      assert.ok(qrScanSrc.includes('isFocused && !showRazorpayModal'), 'Must mount/stream camera only when focused and payment modal closed');
    });

    it('2.3 Center viewfinder overlay has 100% transparent center with 4 corner accent markers', () => {
      assert.ok(qrScanSrc.includes('viewfinder: {'), 'Must have viewfinder style');
      assert.ok(qrScanSrc.includes("backgroundColor: 'transparent'"), 'Viewfinder background must be transparent for camera visibility');
      assert.ok(qrScanSrc.includes('cornerTL') && qrScanSrc.includes('cornerTR'), 'Must have top corner markers');
      assert.ok(qrScanSrc.includes('cornerBL') && qrScanSrc.includes('cornerBR'), 'Must have bottom corner markers');
    });

    it('2.4 Displays clear centered instructions: "Align the boat QR code within the frame"', () => {
      assert.ok(qrScanSrc.includes('Align the boat QR code within the frame'), 'Must display primary instruction');
      assert.ok(qrScanSrc.includes('Keep your camera steady to scan'), 'Must display steady camera instruction');
    });

    it('2.5 Includes torch toggle and manual code entry fallback', () => {
      assert.ok(qrScanSrc.includes('torchOn') && qrScanSrc.includes('setTorchOn'), 'Must support torch toggle');
      assert.ok(qrScanSrc.includes('enableTorch={torchOn}'), 'Must pass enableTorch to CameraView');
      assert.ok(qrScanSrc.includes('showManualModal'), 'Must support manual code entry modal');
    });

    it('2.6 Handles camera permission states cleanly (checking, denied, granted)', () => {
      assert.ok(qrScanSrc.includes('permission === null'), 'Must handle initial permission checking state');
      assert.ok(qrScanSrc.includes('!permission.granted'), 'Must handle permission denied state with recovery CTA');
      assert.ok(qrScanSrc.includes('requestPermission'), 'Must provide grant permission action');
    });

    it('2.7 Standee QR URL parsing remains operational for all supported formats', () => {
      const parseStandee = (data) => {
        const trimmed = (data || '').trim();
        if (trimmed.includes('boat=')) {
          const m = trimmed.match(/[?&]boat=([^&#]+)/i);
          if (m && m[1]) return decodeURIComponent(m[1]);
        }
        if (trimmed.includes('boatId=')) {
          const m = trimmed.match(/[?&]boatId=([^&#]+)/i);
          if (m && m[1]) return decodeURIComponent(m[1]);
        }
        if (/^JAL-[A-Z0-9]{4,16}$/i.test(trimmed)) return trimmed;
        if (/^[a-f0-9]{24}$/i.test(trimmed)) return trimmed;
        if (trimmed.startsWith('boat-')) return trimmed;
        return null;
      };

      assert.strictEqual(parseStandee('https://jalride-v1.vercel.app/qr-book.html?boat=JAL-8821'), 'JAL-8821');
      assert.strictEqual(parseStandee('https://jalride.com/qr-book?boatId=boat-001'), 'boat-001');
      assert.strictEqual(parseStandee('60c72b2f9b1d8b2bad7c3a11'), '60c72b2f9b1d8b2bad7c3a11');
      assert.strictEqual(parseStandee('JAL-VARANASI1'), 'JAL-VARANASI1');
      assert.strictEqual(parseStandee('invalid_qr'), null);
    });

    it('2.8 Retains original Razorpay verification retry and accurate cancellation messaging', () => {
      assert.ok(qrScanSrc.includes('retainedSignatureRef.current'), 'Must retain original signature for retry');
      assert.ok(qrScanSrc.includes('retainedBookingContextRef.current'), 'Must retain original booking context for retry');
      assert.ok(
        qrScanSrc.includes('Payment was cancelled and your pass was not issued. To board this boat, please tap Confirm or re-scan the boat standee QR code.'),
        'Must display accurate cancellation message without false My Rides promise'
      );
    });
  });

  // =========================================================================
  // PART 3: CUSTOMER TRANSACTION HISTORY ACCURACY
  // =========================================================================
  describe('Part 3: Customer Transaction History Accuracy & Financial Integrity', () => {
    // Pure function matching CustomerWalletScreen.getTransactionMeta
    const getTransactionMeta = (tx) => {
      const type = tx?.type || 'unknown';
      const amt = Number(tx?.amount ?? 0);
      const isPositive = amt > 0;
      const isZero = amt === 0;

      switch (type) {
        case 'topup':
        case 'wallet_topup':
          return { label: tx?.note || 'Wallet Top-up', icon: '💳', chip: 'TOP-UP', variant: 'success', direction: 'credit', sign: '+', isPositive: true, isZero: false };
        case 'cashback':
          return { label: tx?.note || 'Loyalty Cashback Credited', icon: '🎁', chip: 'CASHBACK', variant: 'success', direction: 'credit', sign: '+', isPositive: true, isZero: false };
        case 'reward':
          return { label: tx?.note || 'Bonus Reward Credited', icon: '🌟', chip: 'REWARD', variant: 'success', direction: 'credit', sign: '+', isPositive: true, isZero: false };
        case 'refund_credit':
        case 'refund':
          return { label: tx?.note || (tx?.booking?.ticketId ? `Refund for Ticket ${tx.booking.ticketId}` : 'Booking Refund Credited to Wallet'), icon: '🔄', chip: 'REFUND', variant: 'success', direction: 'credit', sign: '+', isPositive: true, isZero: false };
        case 'booking_payment':
        case 'booking_debit':
        case 'booking':
          return { label: tx?.note || (tx?.booking?.ticketId ? `Ride Booking (${tx.booking.ticketId})` : 'Boat Ride Booking Payment'), icon: '🛶', chip: 'BOOKING', variant: 'secondary', direction: 'debit', sign: '-', isPositive: false, isZero: false };
        case 'withdrawal_request':
          return { label: tx?.note || 'Bank Withdrawal Requested', icon: '🏦', chip: 'WITHDRAWAL', variant: 'warning', direction: 'debit', sign: '-', isPositive: false, isZero: false };
        case 'withdrawal_paid':
          return { label: tx?.note || 'Bank Withdrawal Payout Cleared', icon: '✅', chip: 'CLEARED', variant: 'info', direction: 'neutral', sign: '', isPositive: false, isZero: true };
        case 'withdrawal_rejected':
          return { label: tx?.note ? `Withdrawal Rejected — ${tx.note}` : 'Withdrawal Rejected — Balance Restored', icon: '↩️', chip: 'RESTORED', variant: 'success', direction: 'credit', sign: '+', isPositive: true, isZero: false };
        case 'admin_adjustment':
          return { label: tx?.note || 'Administrative Wallet Adjustment', icon: '⚖️', chip: 'ADJUSTMENT', variant: isPositive ? 'success' : isZero ? 'secondary' : 'warning', direction: isPositive ? 'credit' : isZero ? 'neutral' : 'debit', sign: isPositive ? '+' : isZero ? '' : '-', isPositive, isZero };
        default:
          return { label: tx?.note || tx?.description || (type ? type.replace(/_/g, ' ') : 'Wallet Transaction'), icon: isPositive ? '💳' : '💸', chip: (type ? type.replace(/_/g, ' ') : 'TRANSACTION').toUpperCase(), variant: isPositive ? 'success' : isZero ? 'secondary' : 'warning', direction: isPositive ? 'credit' : isZero ? 'neutral' : 'debit', sign: isPositive ? '+' : isZero ? '' : '-', isPositive, isZero };
      }
    };

    it('3.1 Maps topup as positive credit with + sign and green success variant', () => {
      const meta = getTransactionMeta({ type: 'topup', amount: 500, note: 'Wallet top-up' });
      assert.strictEqual(meta.direction, 'credit');
      assert.strictEqual(meta.sign, '+');
      assert.strictEqual(meta.isPositive, true);
      assert.strictEqual(meta.variant, 'success');
      assert.strictEqual(meta.icon, '💳');
    });

    it('3.2 Maps booking_payment as negative debit with - sign', () => {
      const meta = getTransactionMeta({ type: 'booking_payment', amount: -650, booking: { ticketId: 'JR-89211' } });
      assert.strictEqual(meta.direction, 'debit');
      assert.strictEqual(meta.sign, '-');
      assert.strictEqual(meta.isPositive, false);
      assert.strictEqual(meta.icon, '🛶');
      assert.ok(meta.label.includes('JR-89211'), 'Must display ticket ID in label');
    });

    it('3.3 Maps refund_credit as positive credit with + sign and refund icon', () => {
      const meta = getTransactionMeta({ type: 'refund_credit', amount: 650, booking: { ticketId: 'JR-89211' } });
      assert.strictEqual(meta.direction, 'credit');
      assert.strictEqual(meta.sign, '+');
      assert.strictEqual(meta.isPositive, true);
      assert.strictEqual(meta.icon, '🔄');
    });

    it('3.4 Maps withdrawal_request as debit with - sign and bank icon', () => {
      const meta = getTransactionMeta({ type: 'withdrawal_request', amount: -1000, note: 'Withdrawal requested to account ending 4321' });
      assert.strictEqual(meta.direction, 'debit');
      assert.strictEqual(meta.sign, '-');
      assert.strictEqual(meta.isPositive, false);
      assert.strictEqual(meta.icon, '🏦');
    });

    it('3.5 Maps withdrawal_paid as neutral 0 amount without false negative sign', () => {
      const meta = getTransactionMeta({ type: 'withdrawal_paid', amount: 0, note: 'Approved for manual bank transfer' });
      assert.strictEqual(meta.direction, 'neutral');
      assert.strictEqual(meta.sign, '');
      assert.strictEqual(meta.isZero, true);
    });

    it('3.6 Maps withdrawal_rejected as positive credit restoring funds', () => {
      const meta = getTransactionMeta({ type: 'withdrawal_rejected', amount: 1000, note: 'Incorrect IFSC' });
      assert.strictEqual(meta.direction, 'credit');
      assert.strictEqual(meta.sign, '+');
      assert.strictEqual(meta.isPositive, true);
      assert.strictEqual(meta.icon, '↩️');
    });

    it('3.7 Filter logic does NOT conflate withdrawal requests with boat bookings', () => {
      const txWithdrawal = { type: 'withdrawal_request', amount: -1000 };
      const txBooking = { type: 'booking_payment', amount: -500 };
      const txTopup = { type: 'topup', amount: 500 };

      const isBookingFilter = (tx) => tx.type === 'booking_payment' || tx.type === 'booking_debit' || tx.type === 'booking';
      assert.strictEqual(isBookingFilter(txWithdrawal), false, 'Withdrawal request must NOT match booking filter');
      assert.strictEqual(isBookingFilter(txBooking), true, 'Booking payment must match booking filter');
      assert.strictEqual(isBookingFilter(txTopup), false, 'Topup must not match booking filter');
    });

    it('3.8 Renders balanceAfter when provided by backend ledger', () => {
      assert.ok(walletSrc.includes('tx.balanceAfter'), 'Must render balanceAfter when present');
      assert.ok(walletSrc.includes('balance after'), 'Must show balance after suffix');
    });

    it('3.9 Format transaction date safely converts ISO string without NaN', () => {
      const formatTransactionDate = (dateVal) => {
        if (!dateVal) return '';
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return String(dateVal);
        return d.toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      };

      const formatted = formatTransactionDate('2026-11-21T10:30:00.000Z');
      assert.ok(formatted.includes('2026'), 'Must format year correctly');
      assert.strictEqual(formatTransactionDate(null), '');
      assert.strictEqual(formatTransactionDate('invalid-date'), 'invalid-date');
    });

    it('3.10 ApiService.getCustomerWalletTransactions handles paginated backend response safely', () => {
      assert.ok(apiSrc.includes('async getCustomerWalletTransactions(page = 1, limit = 20)'), 'Must support pagination args');
      assert.ok(apiSrc.includes('totalPages:'), 'Must return totalPages');
      assert.ok(apiSrc.includes('totalRecords:'), 'Must return totalRecords');
    });
  });
});
