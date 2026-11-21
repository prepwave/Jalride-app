import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function OwnerAvailabilityScreen({ navigation, route }) {
  const { boat } = route.params || {};
  const { isDark } = useTheme();

  // Calendar navigation state
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-12
  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' | 'recurring'
  const [calendarDays, setCalendarDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayDetail, setDayDetail] = useState(null);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [loadingDayDetail, setLoadingDayDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Price override modal state
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceInput, setPriceInput] = useState('');

  // Recurring schedules state
  const [recurringList, setRecurringList] = useState([]);
  const [showAddRecurringModal, setShowAddRecurringModal] = useState(false);
  const [recurringName, setRecurringName] = useState('Weekend Evening Aarti');
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState([5, 6, 0]); // Fri, Sat, Sun
  const [recurringSlotTime, setRecurringSlotTime] = useState('17:30');
  const [recurringSlots, setRecurringSlots] = useState(['17:30', '18:30']);

  const isFetchingRef = useRef(false);
  const hasQueuedRefreshRef = useRef(false);

  if (!boat || !boat._id) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <Header title="Boat Availability" onBack={() => navigation.goBack()} />
        <View style={styles.centerBox}>
          <Text style={{ color: colors.gray500 }}>No vessel selected.</Text>
        </View>
      </View>
    );
  }

  // Load Month Calendar
  const loadCalendar = useCallback(async (isSilent = false) => {
    if (isFetchingRef.current) {
      hasQueuedRefreshRef.current = true;
      return;
    }
    isFetchingRef.current = true;
    if (!isSilent) setLoadingCalendar(true);
    try {
      const res = await api.getOwnerBoatCalendar(boat._id, monthKey);
      if (res && res.success) {
        setCalendarDays(Array.isArray(res.days) ? res.days : []);
      }
    } catch (err) {
      console.warn('Error loading calendar:', err);
    } finally {
      isFetchingRef.current = false;
      setLoadingCalendar(false);
      if (hasQueuedRefreshRef.current) {
        hasQueuedRefreshRef.current = false;
        loadCalendar(true);
      }
    }
  }, [boat._id, monthKey]);

  // Load Recurring Schedules
  const loadRecurring = useCallback(async () => {
    try {
      const res = await api.listBoatRecurringSchedules(boat._id);
      if (res && res.success) {
        setRecurringList(Array.isArray(res.schedules) ? res.schedules : []);
      }
    } catch (err) {
      console.warn('Error loading recurring:', err);
    }
  }, [boat._id]);

  // Load Day Detail
  const loadDayDetail = async (dateStr) => {
    setSelectedDate(dateStr);
    setLoadingDayDetail(true);
    try {
      const res = await api.getOwnerBoatDayDetail(boat._id, dateStr);
      if (res && res.success) {
        setDayDetail(res);
      }
    } catch (err) {
      console.warn('Error loading day detail:', err);
      Alert.alert('Load Failed', err.message || 'Could not fetch details for this date.');
    } finally {
      setLoadingDayDetail(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCalendar(true);
      loadRecurring();
    }, [loadCalendar, loadRecurring])
  );

  useEffect(() => {
    loadCalendar();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        loadCalendar(true);
      }
    });
    return () => sub.remove();
  }, [loadCalendar]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Conflict-aware date status updater
  const executeDateUpdate = async (type, force = false) => {
    if (!selectedDate) return;
    setActionLoading(true);
    try {
      let res;
      if (type === 'closed') {
        res = await api.setBoatClosedDates(boat._id, {
          dates: [selectedDate],
          reason: 'Owner day off / Boat closed',
          force,
        });
      } else if (type === 'maintenance') {
        res = await api.setBoatMaintenance(boat._id, {
          dates: [selectedDate],
          reason: 'Vessel Maintenance / Inspection',
          force,
        });
      } else if (type === 'revert') {
        res = await api.deleteBoatDateOverride(boat._id, selectedDate);
      }

      Alert.alert('Schedule Updated', res?.message || 'Date availability updated successfully.');
      await loadCalendar(true);
      await loadDayDetail(selectedDate);
    } catch (err) {
      // Conflict Detection: HTTP 409
      if (err.status === 409 || (err.data && err.data.conflicts)) {
        const conflictList = err.data?.conflicts || [];
        Alert.alert(
          '⚠️ Active Booking Conflict (Action Blocked)',
          `There are ${conflictList.length} active booking(s) on ${selectedDate}.\n\nExisting bookings are NOT automatically cancelled or refunded by the system. To protect confirmed passengers, you must reassign or resolve these bookings through Dispatch/Support before taking this vessel offline on this date.`,
          [{ text: 'Understood', style: 'default' }]
        );
      } else {
        Alert.alert('Action Failed', err.message || 'Unable to update schedule.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSavePriceOverride = async () => {
    if (!selectedDate) return;
    setActionLoading(true);
    try {
      const p = priceInput.trim() === '' ? null : parseFloat(priceInput);
      if (p !== null && (isNaN(p) || p < 0)) {
        Alert.alert('Invalid Price', 'Price must be a positive number or empty to clear.');
        return;
      }
      const res = await api.setBoatDatePriceOverride(boat._id, selectedDate, p);
      setShowPriceModal(false);
      Alert.alert('Price Override Saved', res?.message || 'Date pricing updated.');
      await loadCalendar(true);
      await loadDayDetail(selectedDate);
    } catch (err) {
      Alert.alert('Price Update Failed', err.message || 'Unable to save price override.');
    } finally {
      setActionLoading(false);
    }
  };

  // Recurring schedules handlers
  const handleCreateRecurring = async () => {
    if (selectedDaysOfWeek.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one day of the week.');
      return;
    }
    if (recurringSlots.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one departure slot.');
      return;
    }
    setActionLoading(true);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const res = await api.createBoatRecurringSchedule(boat._id, {
        name: recurringName.trim() || 'Weekly Schedule',
        daysOfWeek: selectedDaysOfWeek,
        slots: recurringSlots,
        startDate: todayStr,
      });
      setShowAddRecurringModal(false);
      Alert.alert('Recurring Pattern Created', res?.message || 'Weekly pattern is now active.');
      await loadRecurring();
      await loadCalendar(true);
    } catch (err) {
      Alert.alert('Creation Failed', err.message || 'Could not create recurring schedule.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRecurring = (sched) => {
    Alert.alert(
      'Delete Weekly Pattern',
      `Delete "${sched.name}"? Dates relying on this pattern will revert to standard boat defaults.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteBoatRecurringSchedule(boat._id, sched._id);
              Alert.alert('Deleted', 'Weekly pattern removed.');
              await loadRecurring();
              await loadCalendar(true);
            } catch (err) {
              Alert.alert('Error', err.message || 'Unable to delete schedule.');
            }
          },
        },
      ]
    );
  };

  // Build month grid cells
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0-6
  const daysInMonthCount = new Date(currentYear, currentMonth, 0).getDate();

  const dayMap = {};
  calendarDays.forEach((d) => {
    dayMap[d.date] = d;
  });

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title={boat.boatName}
        subtitle="Departure Slots & Availability Calendar"
        onBack={() => navigation.goBack()}
      />

      {/* Segmented Control: Calendar Grid vs Recurring Patterns */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'calendar' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('calendar')}
        >
          <Text style={[styles.segmentBtnText, activeTab === 'calendar' && styles.segmentBtnTextActive]}>
            📅 Month Calendar & Dates
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'recurring' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('recurring')}
        >
          <Text style={[styles.segmentBtnText, activeTab === 'recurring' && styles.segmentBtnTextActive]}>
            🔁 Recurring Weekly Patterns
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loadingCalendar}
            onRefresh={() => {
              loadCalendar(false);
              loadRecurring();
            }}
            colors={[colors.teal]}
            tintColor={colors.teal}
          />
        }
      >
        {activeTab === 'calendar' ? (
          <>
            {/* Month Header Navigation */}
            <Card style={styles.calCard}>
              <View style={styles.monthNavRow}>
                <TouchableOpacity style={styles.navArrowBtn} onPress={handlePrevMonth}>
                  <Text style={styles.navArrowText}>◀</Text>
                </TouchableOpacity>

                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.monthTitle, isDark && styles.textLight]}>
                    {MONTH_NAMES[currentMonth - 1]} {currentYear}
                  </Text>
                  <Text style={styles.monthSub}>Departure Port: {boat.location}</Text>
                </View>

                <TouchableOpacity style={styles.navArrowBtn} onPress={handleNextMonth}>
                  <Text style={styles.navArrowText}>▶</Text>
                </TouchableOpacity>
              </View>

              {/* Day of Week Labels */}
              <View style={styles.dowRow}>
                {WEEKDAYS.map((dow) => (
                  <Text key={dow} style={styles.dowText}>
                    {dow}
                  </Text>
                ))}
              </View>

              {/* Month Grid */}
              <View style={styles.grid}>
                {/* Blank padding cells before 1st of month */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.dayCellEmpty} />
                ))}

                {/* Days 1..N */}
                {Array.from({ length: daysInMonthCount }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const info = dayMap[dateStr] || {};
                  const isSelected = selectedDate === dateStr;
                  const status = info.status || 'open';
                  const isBlocked = status === 'blocked' || status === 'closed' || status === 'maintenance';
                  const hasBookings = (info.bookingCount || 0) > 0;
                  const isFull = info.isFull;

                  return (
                    <TouchableOpacity
                      key={dateStr}
                      style={[
                        styles.dayCell,
                        isSelected && styles.dayCellSelected,
                        status === 'closed' && styles.dayCellClosed,
                        status === 'maintenance' && styles.dayCellMaintenance,
                        isFull && styles.dayCellFull,
                      ]}
                      onPress={() => loadDayDetail(dateStr)}
                    >
                      <Text
                        style={[
                          styles.dayNum,
                          isSelected && styles.dayNumSelected,
                          isBlocked && styles.dayNumBlocked,
                        ]}
                      >
                        {dayNum}
                      </Text>

                      {/* Status / Booking Indicator Dots */}
                      <View style={styles.dotsRow}>
                        {hasBookings && <View style={styles.bookingDot} />}
                        {info.hasPriceOverride && <View style={styles.priceDot} />}
                      </View>

                      {/* Starting Price or Status Tag */}
                      <Text style={styles.cellPriceText} numberOfLines={1}>
                        {status === 'closed'
                          ? 'Closed'
                          : status === 'maintenance'
                          ? 'Maint.'
                          : info.startingPrice
                          ? `₹${info.startingPrice}`
                          : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Calendar Legend */}
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: '#ecfdf5', borderColor: '#10b981' }]} />
                  <Text style={styles.legendText}>Open</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: '#fff1f2', borderColor: '#f43f5e' }]} />
                  <Text style={styles.legendText}>Closed</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: '#fffbeb', borderColor: '#f59e0b' }]} />
                  <Text style={styles.legendText}>Maintenance</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={styles.bookingDot} />
                  <Text style={styles.legendText}>Bookings</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={styles.priceDot} />
                  <Text style={styles.legendText}>Price Rule</Text>
                </View>
              </View>
            </Card>

            {/* Selected Day Detail Card */}
            {selectedDate && (
              <Card style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <View>
                    <Text style={[styles.detailDateTitle, isDark && styles.textLight]}>
                      {selectedDate} ({dayDetail?.weekday || 'Slot Details'})
                    </Text>
                    <Text style={styles.detailStatusSub}>
                      Status: <Text style={{ fontWeight: '700', textTransform: 'uppercase' }}>{dayDetail?.status || 'Open'}</Text>
                      {dayDetail?.reason ? ` • ${dayDetail.reason}` : ''}
                    </Text>
                  </View>
                  <Badge
                    label={dayDetail?.status || 'open'}
                    variant={
                      dayDetail?.status === 'closed'
                        ? 'danger'
                        : dayDetail?.status === 'maintenance'
                        ? 'warning'
                        : 'success'
                    }
                  />
                </View>

                {loadingDayDetail ? (
                  <ActivityIndicator size="small" color={colors.teal} style={{ marginVertical: 20 }} />
                ) : (
                  <>
                    {/* Departure Slots Breakdown */}
                    <Text style={styles.sectionSubHeader}>Departure Slots & Live Seating</Text>
                    {(!dayDetail?.slots || dayDetail.slots.length === 0) ? (
                      <View style={styles.noSlotsBox}>
                        <Text style={styles.noSlotsText}>
                          {dayDetail?.status === 'closed'
                            ? 'Boat is closed on this date. No slots available.'
                            : dayDetail?.status === 'maintenance'
                            ? 'Vessel is in maintenance on this date.'
                            : 'No departure slots resolved for this date. Configure slots or check recurring schedule.'}
                        </Text>
                      </View>
                    ) : (
                      dayDetail.slots.map((slot, idx) => (
                        <View key={`slot-${idx}`} style={styles.slotRow}>
                          <View style={styles.slotTimeCol}>
                            <Text style={styles.slotTime}>🕒 {slot.time}</Text>
                            <Text style={styles.slotFare}>
                              ₹{slot.price?.finalPrice || boat.price}
                              {slot.price?.adjustments?.length ? ' (Special)' : ''}
                            </Text>
                          </View>

                          <View style={styles.slotSeatsCol}>
                            <Text style={styles.slotSeatsVal}>
                              {slot.seatsBooked} / {slot.capacity} Booked
                            </Text>
                            <Text
                              style={[
                                styles.slotSeatsRem,
                                slot.seatsRemaining === 0 ? { color: colors.danger } : {},
                              ]}
                            >
                              {slot.seatsRemaining === 0 ? 'FULL' : `${slot.seatsRemaining} seats left`}
                            </Text>
                          </View>
                        </View>
                      ))
                    )}

                    {/* Quick Date Actions */}
                    <Text style={[styles.sectionSubHeader, { marginTop: spacing.l }]}>Manage Date Overrides</Text>
                    <View style={styles.dateActionGrid}>
                      <TouchableOpacity
                        style={[styles.actionChip, { backgroundColor: '#fff1f2', borderColor: '#fecdd3' }]}
                        onPress={() => executeDateUpdate('closed')}
                        disabled={actionLoading}
                      >
                        <Text style={[styles.actionChipText, { color: '#e11d48' }]}>🚫 Mark Closed</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionChip, { backgroundColor: '#fffbeb', borderColor: '#fef3c7' }]}
                        onPress={() => executeDateUpdate('maintenance')}
                        disabled={actionLoading}
                      >
                        <Text style={[styles.actionChipText, { color: '#d97706' }]}>🛠️ Set Maintenance</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionChip, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}
                        onPress={() => executeDateUpdate('revert')}
                        disabled={actionLoading}
                      >
                        <Text style={[styles.actionChipText, { color: '#16a34a' }]}>↩ Revert to Default</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionChip, { backgroundColor: colors.tealMist, borderColor: colors.teal }]}
                        onPress={() => {
                          setPriceInput(dayDetail?.priceOverride ? String(dayDetail.priceOverride) : '');
                          setShowPriceModal(true);
                        }}
                        disabled={actionLoading}
                      >
                        <Text style={[styles.actionChipText, { color: colors.teal }]}>
                          💰 {dayDetail?.priceOverride ? `Override: ₹${dayDetail.priceOverride}` : 'Set Price Override'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </Card>
            )}
          </>
        ) : (
          /* Recurring Weekly Schedules Tab */
          <Card style={styles.calCard}>
            <View style={styles.recurringHeader}>
              <View>
                <Text style={[styles.monthTitle, isDark && styles.textLight]}>Weekly Schedules</Text>
                <Text style={styles.monthSub}>Standing departure patterns for peak days & weekends</Text>
              </View>

              <TouchableOpacity
                style={styles.addRecurringBtn}
                onPress={() => setShowAddRecurringModal(true)}
              >
                <Text style={styles.addRecurringBtnText}>+ Add Pattern</Text>
              </TouchableOpacity>
            </View>

            {recurringList.length === 0 ? (
              <View style={styles.emptyRecurringBox}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>🔁</Text>
                <Text style={styles.emptyRecurringTitle}>No Recurring Weekly Patterns</Text>
                <Text style={styles.emptyRecurringSub}>
                  Create automatic weekly schedules for weekends, Ganga Aarti times, or sunrise slots.
                </Text>
              </View>
            ) : (
              recurringList.map((sched) => (
                <View key={sched._id} style={styles.recurringCard}>
                  <View style={styles.recurringTopRow}>
                    <Text style={styles.recurringName}>{sched.name}</Text>
                    <TouchableOpacity onPress={() => handleDeleteRecurring(sched)}>
                      <Text style={styles.deleteSchedText}>🗑️ Delete</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.recurringDays}>
                    Days: {sched.daysOfWeek?.map((d) => WEEKDAYS[d]).join(', ')}
                  </Text>

                  <View style={styles.recurringSlotsRow}>
                    {sched.slots?.map((s) => (
                      <View key={s} style={styles.slotPill}>
                        <Text style={styles.slotPillText}>🕒 {s}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </Card>
        )}
      </ScrollView>

      {/* Manual Price Override Modal */}
      <Modal visible={showPriceModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set Price Override for {selectedDate}</Text>
            <Text style={styles.modalSub}>
              Overrides the base seat fare for this specific date only. Leave empty to clear and use standard pricing.
            </Text>

            <TextInput
              style={styles.priceInput}
              keyboardType="numeric"
              placeholder={`Base: ₹${boat.price}`}
              value={priceInput}
              onChangeText={setPriceInput}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowPriceModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSavePriceOverride}
              >
                <Text style={styles.modalSaveText}>Save Price</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </Modal>

      {/* Add Recurring Schedule Modal */}
      <Modal visible={showAddRecurringModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCardLarge}>
            <Text style={styles.modalTitle}>New Recurring Weekly Schedule</Text>
            <Text style={styles.modalSub}>
              Sets automatic slots every week for selected weekdays.
            </Text>

            <Text style={styles.inputLabel}>Pattern Name</Text>
            <TextInput
              style={styles.priceInput}
              value={recurringName}
              onChangeText={setRecurringName}
              placeholder="e.g. Weekend Ganga Aarti Schedule"
            />

            <Text style={styles.inputLabel}>Select Weekdays</Text>
            <View style={styles.dowPickerRow}>
              {WEEKDAYS.map((dow, idx) => {
                const isSelected = selectedDaysOfWeek.includes(idx);
                return (
                  <TouchableOpacity
                    key={dow}
                    style={[styles.dowPickBtn, isSelected && styles.dowPickBtnActive]}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedDaysOfWeek((prev) => prev.filter((d) => d !== idx));
                      } else {
                        setSelectedDaysOfWeek((prev) => [...prev, idx]);
                      }
                    }}
                  >
                    <Text style={[styles.dowPickText, isSelected && styles.dowPickTextActive]}>
                      {dow}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Add Departure Time (HH:MM 24h)</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.priceInput, { flex: 1 }]}
                value={recurringSlotTime}
                onChangeText={setRecurringSlotTime}
                placeholder="18:30"
              />
              <TouchableOpacity
                style={styles.addSlotBtn}
                onPress={() => {
                  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(recurringSlotTime)) {
                    if (!recurringSlots.includes(recurringSlotTime)) {
                      setRecurringSlots((prev) => [...prev, recurringSlotTime].sort());
                    }
                  } else {
                    Alert.alert('Invalid Format', 'Time must be in 24h HH:MM format (e.g. 06:30, 18:00).');
                  }
                }}
              >
                <Text style={styles.addSlotBtnText}>+ Add</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.slotsChipRow}>
              {recurringSlots.map((s) => (
                <View key={s} style={styles.slotChip}>
                  <Text style={styles.slotChipText}>🕒 {s}</Text>
                  <TouchableOpacity
                    onPress={() => setRecurringSlots((prev) => prev.filter((x) => x !== s))}
                  >
                    <Text style={styles.slotChipRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAddRecurringModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleCreateRecurring}
              >
                <Text style={styles.modalSaveText}>Create Schedule</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  containerDark: {
    backgroundColor: '#0a1e23',
  },
  scroll: {
    padding: spacing.m,
    paddingBottom: 80,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    marginHorizontal: spacing.m,
    marginTop: spacing.s,
    borderRadius: radii.m,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radii.s,
  },
  segmentBtnActive: {
    backgroundColor: colors.white,
    ...shadows.soft,
  },
  segmentBtnText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.gray500,
  },
  segmentBtnTextActive: {
    color: colors.teal,
    fontWeight: '700',
  },
  calCard: {
    padding: spacing.m,
    borderRadius: radii.l,
    marginBottom: spacing.m,
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  navArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowText: {
    fontSize: 14,
    color: colors.ink,
  },
  monthTitle: {
    ...typography.h3,
    color: colors.ink,
  },
  monthSub: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  textLight: {
    color: colors.white,
  },
  dowRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 8,
    marginBottom: 6,
  },
  dowText: {
    flex: 1,
    textAlign: 'center',
    ...typography.caption,
    fontWeight: '700',
    color: colors.gray400,
    fontSize: 11,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellEmpty: {
    width: '14.28%',
    height: 54,
  },
  dayCell: {
    width: '14.28%',
    height: 54,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
    borderRadius: radii.s,
  },
  dayCellSelected: {
    backgroundColor: colors.tealMist,
    borderWidth: 1.5,
    borderColor: colors.teal,
  },
  dayCellClosed: {
    backgroundColor: '#fff1f2',
  },
  dayCellMaintenance: {
    backgroundColor: '#fffbeb',
  },
  dayCellFull: {
    backgroundColor: '#f1f5f9',
  },
  dayNum: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.ink,
    fontSize: 12,
  },
  dayNumSelected: {
    color: colors.teal,
  },
  dayNumBlocked: {
    color: colors.gray400,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
  },
  bookingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#f59e0b',
  },
  priceDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.teal,
  },
  cellPriceText: {
    fontSize: 8,
    fontWeight: '600',
    color: colors.gray500,
    marginTop: 1,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.m,
    marginTop: spacing.s,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendBox: {
    width: 10,
    height: 10,
    borderRadius: 2,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 10,
    color: colors.gray500,
    fontWeight: '500',
  },
  detailCard: {
    padding: spacing.l,
    borderRadius: radii.l,
    marginBottom: spacing.l,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: spacing.m,
  },
  detailDateTitle: {
    ...typography.h3,
    color: colors.ink,
  },
  detailStatusSub: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  sectionSubHeader: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.gray400,
    letterSpacing: 0.5,
    marginTop: spacing.m,
    marginBottom: spacing.s,
    textTransform: 'uppercase',
  },
  noSlotsBox: {
    backgroundColor: colors.mist,
    padding: spacing.m,
    borderRadius: radii.m,
  },
  noSlotsText: {
    ...typography.caption,
    color: colors.gray600,
    lineHeight: 16,
  },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  slotTimeCol: {},
  slotTime: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
  },
  slotFare: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '600',
    marginTop: 2,
  },
  slotSeatsCol: {
    alignItems: 'flex-end',
  },
  slotSeatsVal: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.ink,
  },
  slotSeatsRem: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
    marginTop: 2,
  },
  dateActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  actionChip: {
    borderWidth: 1,
    borderRadius: radii.m,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionChipText: {
    ...typography.caption,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.l,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    padding: spacing.l,
    borderRadius: radii.l,
  },
  modalCardLarge: {
    width: '100%',
    maxWidth: 400,
    padding: spacing.l,
    borderRadius: radii.l,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.ink,
    marginBottom: 4,
  },
  modalSub: {
    ...typography.caption,
    color: colors.gray500,
    lineHeight: 16,
    marginBottom: spacing.m,
  },
  inputLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.ink,
    marginTop: spacing.s,
    marginBottom: 4,
  },
  priceInput: {
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.m,
    paddingHorizontal: spacing.m,
    paddingVertical: 10,
    ...typography.body,
    marginBottom: spacing.m,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.s,
    marginTop: spacing.m,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: spacing.m,
  },
  modalCancelText: {
    ...typography.button,
    color: colors.gray500,
  },
  modalSaveBtn: {
    backgroundColor: colors.teal,
    paddingVertical: 10,
    paddingHorizontal: spacing.l,
    borderRadius: radii.m,
  },
  modalSaveText: {
    ...typography.button,
    color: colors.white,
  },
  recurringHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  addRecurringBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  addRecurringBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.white,
  },
  emptyRecurringBox: {
    padding: 32,
    alignItems: 'center',
  },
  emptyRecurringTitle: {
    ...typography.h3,
    color: colors.ink,
    marginBottom: 4,
  },
  emptyRecurringSub: {
    ...typography.caption,
    color: colors.gray500,
    textAlign: 'center',
    lineHeight: 16,
  },
  recurringCard: {
    backgroundColor: colors.mist,
    padding: spacing.m,
    borderRadius: radii.m,
    marginBottom: spacing.s,
  },
  recurringTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recurringName: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
  },
  deleteSchedText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '700',
  },
  recurringDays: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '600',
    marginTop: 4,
  },
  recurringSlotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  slotPill: {
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.s,
    borderWidth: 1,
    borderColor: colors.line,
  },
  slotPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.ink,
  },
  dowPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.m,
  },
  dowPickBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  dowPickBtnActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  dowPickText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.gray600,
  },
  dowPickTextActive: {
    color: colors.white,
  },
  addSlotBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: 16,
    borderRadius: radii.m,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  addSlotBtnText: {
    color: colors.white,
    fontWeight: '700',
  },
  slotsChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.m,
  },
  slotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.mist,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line,
  },
  slotChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },
  slotChipRemove: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
});
