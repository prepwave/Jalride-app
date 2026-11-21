import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Button from './Button';

const RATING_LABELS = {
  1: 'Disappointing 😞',
  2: 'Needs Improvement 😐',
  3: 'Good Experience 🙂',
  4: 'Very Good Ride 😊',
  5: 'Exceptional Journey ⭐',
};

export default function ReviewModal({
  visible,
  onClose,
  booking,
  onReviewSubmitted,
}) {
  const { isDark } = useTheme();

  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (visible && booking?._id) {
      loadExistingReview();
    } else {
      setRating(5);
      setReviewText('');
      setErrorMessage('');
      setIsEditMode(false);
    }
  }, [visible, booking?._id]);

  const loadExistingReview = async () => {
    setIsLoadingExisting(true);
    setErrorMessage('');
    try {
      const existing = await api.getBookingReview(booking._id);
      if (existing && existing._id) {
        setRating(Number(existing.rating) || 5);
        setReviewText(existing.review || '');
        setIsEditMode(true);
      } else {
        setRating(5);
        setReviewText('');
        setIsEditMode(false);
      }
    } catch (_) {
      // Non-fatal, allow new review
      setIsEditMode(false);
    } finally {
      setIsLoadingExisting(false);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage('');
    if (!booking?._id) {
      setErrorMessage('Booking reference missing.');
      return;
    }

    const boatId = booking.boat?._id || booking.boatId || booking.boat;
    if (!boatId) {
      setErrorMessage('Boat information missing for this ride.');
      return;
    }

    if (rating < 1 || rating > 5) {
      setErrorMessage('Please select a rating between 1 and 5 stars.');
      return;
    }

    if (reviewText && reviewText.length > 800) {
      setErrorMessage('Review comments cannot exceed 800 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        boatId: String(boatId),
        bookingId: String(booking._id),
        rating: Number(rating),
        review: reviewText.trim(),
      };

      const res = await api.submitReview(payload);
      if (res && res.success) {
        Alert.alert(
          isEditMode ? 'Review Updated! 🌟' : 'Review Submitted! 🌟',
          res.message || 'Thank you for your feedback! Your review helps pilgrims and boat travelers find quality ghat experiences.'
        );
        if (onReviewSubmitted) {
          onReviewSubmitted(res.review || { rating, review: reviewText });
        }
        onClose();
      } else {
        throw new Error(res?.message || 'Failed to submit review.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Unable to submit review at this time.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => !isSubmitting && onClose()}
    >
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, isDark && styles.modalCardDark]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, isDark && styles.textLight]}>
                {isEditMode ? 'Edit Your Ride Review' : 'Rate Your Boat Journey'}
              </Text>
              <Text style={styles.subtitle}>
                {booking?.boat?.boatName || 'JalRide Certified Boat'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              disabled={isSubmitting}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {isLoadingExisting ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={colors.teal} />
              <Text style={styles.loadingText}>Loading review details...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {errorMessage ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
                </View>
              ) : null}

              {/* Ghat & Slot Badge */}
              <View style={styles.rideBadgeRow}>
                <Text style={styles.rideBadgeText}>
                  📍 {booking?.boat?.location || 'Varanasi Ghat'} • 🗓️ {booking?.bookingDate}
                </Text>
              </View>

              {/* Star Rating Selector */}
              <View style={styles.starSection}>
                <Text style={[styles.ratingLabel, isDark && styles.textLight]}>
                  Overall Experience
                </Text>

                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((s) => {
                    const isSelected = s <= rating;
                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => {
                          setRating(s);
                          if (errorMessage) setErrorMessage('');
                        }}
                        style={styles.starTouch}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.starIcon, isSelected ? styles.starActive : styles.starInactive]}>
                          ★
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.ratingDescriptor}>
                  {RATING_LABELS[rating] || ''}
                </Text>
              </View>

              {/* Written Comment Area */}
              <View style={styles.inputSection}>
                <View style={styles.inputHeaderRow}>
                  <Text style={[styles.inputLabel, isDark && styles.textLight]}>
                    Write a Review (Optional)
                  </Text>
                  <Text style={styles.charCount}>
                    {reviewText.length}/800
                  </Text>
                </View>

                <TextInput
                  style={[styles.textArea, isDark && styles.textAreaDark]}
                  placeholder="Share details about the boat condition, ghat boarding punctuality, captain behavior, or Aarti views..."
                  placeholderTextColor={colors.gray400}
                  multiline={true}
                  numberOfLines={4}
                  maxLength={800}
                  value={reviewText}
                  onChangeText={(t) => {
                    setReviewText(t);
                    if (errorMessage) setErrorMessage('');
                  }}
                />
              </View>

              <View style={styles.guidelineBox}>
                <Text style={styles.guidelineText}>
                  🛡️ Reviews are publicly visible to fellow pilgrims and travelers under community guidelines.
                </Text>
              </View>
            </ScrollView>
          )}

          {/* Action Buttons */}
          <View style={styles.footerRow}>
            <Button
              title={
                isSubmitting
                  ? 'Saving Review...'
                  : isEditMode
                  ? 'Update Review 🌟'
                  : 'Submit Review 🌟'
              }
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting || isLoadingExisting}
              onPress={handleSubmit}
              style={{ width: '100%' }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.l,
    ...shadows.strong,
  },
  modalCardDark: {
    backgroundColor: '#0d2227',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.m,
  },
  title: {
    ...typography.h3,
    color: colors.ink,
  },
  subtitle: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.ink,
    fontWeight: '700',
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: spacing.s,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    padding: spacing.s,
    borderRadius: radii.s,
    marginBottom: spacing.m,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
  },
  rideBadgeRow: {
    backgroundColor: colors.tealMist,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.s,
    marginBottom: spacing.m,
    alignSelf: 'flex-start',
  },
  rideBadgeText: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '700',
  },
  starSection: {
    alignItems: 'center',
    paddingVertical: spacing.s,
    marginBottom: spacing.m,
  },
  ratingLabel: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.s,
  },
  starRow: {
    flexDirection: 'row',
    gap: 12,
  },
  starTouch: {
    padding: 4,
  },
  starIcon: {
    fontSize: 38,
  },
  starActive: {
    color: colors.sun,
  },
  starInactive: {
    color: colors.gray300,
  },
  ratingDescriptor: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.deep,
    marginTop: 6,
  },
  inputSection: {
    marginBottom: spacing.m,
  },
  inputHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.ink,
  },
  charCount: {
    ...typography.caption,
    color: colors.gray400,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.m,
    padding: spacing.m,
    fontSize: 14,
    color: colors.ink,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: colors.white,
  },
  textAreaDark: {
    backgroundColor: '#162f36',
    borderColor: 'rgba(255,255,255,0.1)',
    color: colors.white,
  },
  guidelineBox: {
    backgroundColor: colors.mist,
    padding: spacing.s,
    borderRadius: radii.s,
    marginBottom: spacing.s,
  },
  guidelineText: {
    ...typography.caption,
    color: colors.gray600,
    fontSize: 11,
    lineHeight: 15,
  },
  footerRow: {
    marginTop: spacing.s,
  },
  textLight: {
    color: colors.white,
  },
});
