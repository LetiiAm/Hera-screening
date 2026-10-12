import 'package:flutter/material.dart';
import '../models/health_status.dart';

class HealthStatusCard extends StatelessWidget {
  final HealthCheckResult result;
  final VoidCallback? onRetry;

  const HealthStatusCard({
    super.key,
    required this.result,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final statusColor = result.getStatusColor();
    final statusLabel = result.getStatusLabel();
    final statusIcon = result.getStatusIcon();
    final indicatorLabel = _getIndicatorLabel(result.indicator);

    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: statusColor, width: 3),
        borderRadius: BorderRadius.circular(12),
        color: statusColor.withOpacity(0.05),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with status
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    indicatorLabel,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: Colors.grey[600],
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${result.measurement.toStringAsFixed(1)} ${_getUnit(result.indicator)}',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: statusColor,
                        ),
                  ),
                ],
              ),
              Icon(
                statusIcon,
                size: 48,
                color: statusColor,
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Status label badge
          Chip(
            label: Text(statusLabel),
            backgroundColor: statusColor,
            labelStyle: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          ),
          const SizedBox(height: 12),

          // Message
          Text(
            result.statusMessage,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  height: 1.5,
                  color: Colors.grey[700],
                ),
          ),
          const SizedBox(height: 12),

          // Reference info
          if (result.reference != null)
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(4),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'WHO Reference',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: Colors.grey[600],
                        ),
                  ),
                  Text(
                    '${result.reference!.toStringAsFixed(1)} ${_getUnit(result.indicator)}',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Colors.grey[700],
                        ),
                  ),
                ],
              ),
            ),
          if (onRetry != null) ...
            [
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: onRetry,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: statusColor,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: const Text(
                    'Retake Measurement',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ],
        ],
      ),
    );
  }

  String _getIndicatorLabel(GrowthIndicator indicator) {
    return switch (indicator) {
      GrowthIndicator.height => 'Height',
      GrowthIndicator.weight => 'Weight',
      GrowthIndicator.muac => 'MUAC (Arm Circumference)',
    };
  }

  String _getUnit(GrowthIndicator indicator) {
    return switch (indicator) {
      GrowthIndicator.height => 'cm',
      GrowthIndicator.weight => 'kg',
      GrowthIndicator.muac => 'mm',
    };
  }
}
