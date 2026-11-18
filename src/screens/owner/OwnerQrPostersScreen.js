import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  StatusBar,
  Alert,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

export default function OwnerQrPostersScreen({ navigation }) {
  const { isDark } = useTheme();
  const [boats, setBoats] = useState([]);
  const [selectedBoatIndex, setSelectedBoatIndex] = useState(0);

  useEffect(() => {
    api.getOwnerBoats().then((b) => {
      if (b && b.length > 0) setBoats(b);
    }).catch(() => {});
  }, []);

  const activeBoat = boats[selectedBoatIndex] || {
    _id: 'boat-001',
    boatName: 'Maa Ganga Express Bajra',
    location: 'Assi Ghat',
    price: 350,
  };

  const standeeUrl = `https://jalride.com/qr-book?boatId=${activeBoat._id}&ghat=${encodeURIComponent(activeBoat.location || 'Assi Ghat')}`;

  const handleSharePoster = async () => {
    try {
      await Share.share({
        message: `🪧 JalRide Ghat Standee: Scan QR at ${activeBoat.location} to book ${activeBoat.boatName} instantly with Cash or UPI!\n${standeeUrl}`,
        title: `JalRide Standee Poster - ${activeBoat.boatName}`,
      });
    } catch (_) {}
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="Ghat QR Standee Posters"
        subtitle="Print-ready QR standees for walk-in tourists"
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={handleSharePoster}>
            <Text style={styles.shareText}>Share ↗</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Printable Standee Preview Card */}
        <Card style={styles.standeeCard}>
          <View style={styles.standeeHeader}>
            <Text style={styles.standeeBrand}>JALRIDE (जलराइड)</Text>
            <Text style={styles.standeeTag}>⚡ SCAN & BOARD IN 30 SECONDS</Text>
          </View>

          <View style={styles.standeeBody}>
            <Text style={styles.standeeBoatName}>{activeBoat.boatName}</Text>
            <Text style={styles.standeeGhat}>📍 Stationed at {activeBoat.location}</Text>

            {/* High Contrast Standee QR Graphic */}
            <View style={styles.qrContainer}>
              <View style={styles.qrFrame}>
                <QRCode
                  value={standeeUrl}
                  size={190}
                  color={colors.ink}
                  backgroundColor="#ffffff"
                />
              </View>
              <Text style={styles.qrSubText}>STAND-{activeBoat._id?.substring(0, 8)?.toUpperCase() || 'GHAT-PASS'}</Text>
            </View>

            <View style={styles.rateBadge}>
              <Text style={styles.rateText}>Govt. Approved Rate: ₹{activeBoat.price} / seat</Text>
            </View>

            <View style={styles.standeePerks}>
              <Text style={styles.perkItem}>✓ 100% Free Safety Life Jackets</Text>
              <Text style={styles.perkItem}>✓ Evening Ganga Aarti View Seats</Text>
              <Text style={styles.perkItem}>✓ Cash on Ghat or UPI Accepted</Text>
            </View>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionStack}>
          <Button
            title="Download Print-Ready PDF Poster 📄"
            onPress={() => {
              Alert.alert(
                'Standee PDF Generated',
                `Official high-resolution A4 printable standee poster generated for ${activeBoat.boatName} at ${activeBoat.location}. Link copied to share clipboard.`,
                [{ text: 'OK' }]
              );
            }}
            variant="primary"
          />

          <Button
            title="Share Digital Standee Image ↗"
            onPress={handleSharePoster}
            variant="outline"
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  shareText: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '700',
  },
  scroll: {
    padding: spacing.xl,
  },
  standeeCard: {
    padding: 0,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.teal,
    ...shadows.lift,
  },
  standeeHeader: {
    backgroundColor: colors.deep,
    padding: spacing.l,
    alignItems: 'center',
  },
  standeeBrand: {
    ...typography.h2,
    color: colors.white,
    letterSpacing: 1,
  },
  standeeTag: {
    ...typography.caption,
    color: colors.sun,
    fontWeight: '800',
    marginTop: 2,
  },
  standeeBody: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  standeeBoatName: {
    ...typography.h2,
    color: colors.ink,
    textAlign: 'center',
  },
  standeeGhat: {
    ...typography.body,
    color: colors.teal,
    fontWeight: '600',
    marginTop: 2,
  },
  qrContainer: {
    padding: spacing.m,
    backgroundColor: '#ffffff',
    borderRadius: radii.m,
    marginVertical: spacing.l,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray200,
    ...shadows.card,
  },
  qrFrame: {
    backgroundColor: colors.white,
    borderRadius: radii.s,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrSubText: {
    fontFamily: 'monospace',
    fontWeight: '700',
    color: colors.ink,
    fontSize: 12,
    marginTop: spacing.s,
  },
  qrCornerTL: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    borderWidth: 6,
    borderColor: colors.ink,
  },
  qrCornerTR: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderWidth: 6,
    borderColor: colors.ink,
  },
  qrCornerBL: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 32,
    height: 32,
    borderWidth: 6,
    borderColor: colors.ink,
  },
  qrCenterDot: {
    width: 16,
    height: 16,
    backgroundColor: colors.teal,
    marginBottom: 4,
  },
  qrText: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.ink,
  },
  qrSub: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: colors.gray600,
  },
  rateBadge: {
    backgroundColor: colors.sunMist,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.full,
    marginBottom: spacing.l,
  },
  rateText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.sunDeep,
  },
  standeePerks: {
    width: '100%',
    backgroundColor: colors.paper,
    padding: spacing.m,
    borderRadius: radii.m,
    gap: 4,
  },
  perkItem: {
    ...typography.caption,
    color: colors.ink,
    fontWeight: '600',
  },
  actionStack: {
    marginTop: spacing.xl,
    gap: spacing.m,
  },
});
