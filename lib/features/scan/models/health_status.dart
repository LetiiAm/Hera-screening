enum HealthStatus {
  green, // Normal - within WHO standards
  yellow, // Caution - approaching threshold
  red, // Alert - below WHO standard
}

enum GrowthIndicator {
  height,
  weight,
  muac, // Mid-Upper Arm Circumference
}

class HealthCheckResult {
  final double measurement;
  final GrowthIndicator indicator;
  final HealthStatus status;
  final String statusMessage;
  final double? reference; // WHO standard reference
  final double? deviation; // % deviation from standard

  const HealthCheckResult({
    required this.measurement,
    required this.indicator,
    required this.status,
    required this.statusMessage,
    this.reference,
    this.deviation,
  });

  Color getStatusColor() {
    return switch (status) {
      HealthStatus.green => const Color(0xFF10B981), // Emerald
      HealthStatus.yellow => const Color(0xFFF59E0B), // Amber
      HealthStatus.red => const Color(0xFFEF4444), // Red
    };
  }

  String getStatusLabel() {
    return switch (status) {
      HealthStatus.green => 'Normal',
      HealthStatus.yellow => 'Caution',
      HealthStatus.red => 'Alert',
    };
  }

  IconData getStatusIcon() {
    return switch (status) {
      HealthStatus.green => Icons.check_circle_outline,
      HealthStatus.yellow => Icons.warning_amber,
      HealthStatus.red => Icons.error_outline,
    };
  }
}

import 'package:flutter/material.dart';
