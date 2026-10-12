import '../models/health_status.dart';

class WHOGrowthStandards {
  // WHO height-for-age standards (cm) for children aged 2-5 years
  // These are typical median values; actual use requires interpolated tables
  static const Map<int, Map<String, double>> heightForAge = {
    24: {'green_min': 85, 'yellow_min': 80, 'red_min': 75}, // 24 months
    36: {'green_min': 95, 'yellow_min': 90, 'red_min': 85}, // 36 months
    48: {'green_min': 103, 'yellow_min': 98, 'red_min': 93}, // 48 months
    60: {'green_min': 110, 'yellow_min': 105, 'red_min': 100}, // 60 months
  };

  // WHO weight-for-age standards (kg) for children aged 2-5 years
  static const Map<int, Map<String, double>> weightForAge = {
    24: {'green_min': 12.0, 'yellow_min': 10.5, 'red_min': 9.0}, // 24 months
    36: {'green_min': 14.5, 'yellow_min': 13.0, 'red_min': 11.5}, // 36 months
    48: {'green_min': 16.5, 'yellow_min': 15.0, 'red_min': 13.5}, // 48 months
    60: {'green_min': 18.5, 'yellow_min': 17.0, 'red_min': 15.5}, // 60 months
  };

  // MUAC (Mid-Upper Arm Circumference) standards (mm)
  static const Map<String, double> muacStandards = {
    'green_min': 125.0, // Normal
    'yellow_min': 110.0, // At risk
    'red_min': 100.0, // Severely malnourished
  };
}

class HealthAssessmentService {
  /// Assesses height based on WHO standards and child age in months
  static HealthCheckResult assessHeight(double heightCm, int ageMonths) {
    // Find closest age bracket
    final ages = WHOGrowthStandards.heightForAge.keys.toList();
    ages.sort();

    late Map<String, double> standard;
    int? referenceAge;

    for (final age in ages) {
      if (ageMonths <= age) {
        standard = WHOGrowthStandards.heightForAge[age]!;
        referenceAge = age;
        break;
      }
    }

    // Use latest standard if age exceeds max
    if (referenceAge == null) {
      referenceAge = ages.last;
      standard = WHOGrowthStandards.heightForAge[referenceAge]!;
    }

    final greenMin = standard['green_min']!;
    final yellowMin = standard['yellow_min']!;
    final redMin = standard['red_min']!;

    late HealthStatus status;
    late String message;

    if (heightCm >= greenMin) {
      status = HealthStatus.green;
      message = 'Height is within normal range';
    } else if (heightCm >= yellowMin) {
      status = HealthStatus.yellow;
      message = 'Height is slightly below normal';
    } else if (heightCm >= redMin) {
      status = HealthStatus.red;
      message = 'Height is significantly below WHO standards';
    } else {
      status = HealthStatus.red;
      message = 'Height is well below WHO standards - urgent attention needed';
    }

    final deviation =
        ((heightCm - greenMin) / greenMin) * 100; // % from green threshold

    return HealthCheckResult(
      measurement: heightCm,
      indicator: GrowthIndicator.height,
      status: status,
      statusMessage: message,
      reference: greenMin,
      deviation: deviation,
    );
  }

  /// Assesses weight based on WHO standards
  static HealthCheckResult assessWeight(double weightKg, int ageMonths) {
    final ages = WHOGrowthStandards.weightForAge.keys.toList();
    ages.sort();

    late Map<String, double> standard;
    int? referenceAge;

    for (final age in ages) {
      if (ageMonths <= age) {
        standard = WHOGrowthStandards.weightForAge[age]!;
        referenceAge = age;
        break;
      }
    }

    if (referenceAge == null) {
      referenceAge = ages.last;
      standard = WHOGrowthStandards.weightForAge[referenceAge]!;
    }

    final greenMin = standard['green_min']!;
    final yellowMin = standard['yellow_min']!;
    final redMin = standard['red_min']!;

    late HealthStatus status;
    late String message;

    if (weightKg >= greenMin) {
      status = HealthStatus.green;
      message = 'Weight is within normal range';
    } else if (weightKg >= yellowMin) {
      status = HealthStatus.yellow;
      message = 'Weight is slightly below normal';
    } else if (weightKg >= redMin) {
      status = HealthStatus.red;
      message = 'Weight is significantly below WHO standards';
    } else {
      status = HealthStatus.red;
      message = 'Weight is critically low - urgent intervention needed';
    }

    final deviation = ((weightKg - greenMin) / greenMin) * 100;

    return HealthCheckResult(
      measurement: weightKg,
      indicator: GrowthIndicator.weight,
      status: status,
      statusMessage: message,
      reference: greenMin,
      deviation: deviation,
    );
  }

  /// Assesses MUAC (Mid-Upper Arm Circumference) in mm
  static HealthCheckResult assessMUAC(double muacMm) {
    final greenMin = WHOGrowthStandards.muacStandards['green_min']!;
    final yellowMin = WHOGrowthStandards.muacStandards['yellow_min']!;
    final redMin = WHOGrowthStandards.muacStandards['red_min']!;

    late HealthStatus status;
    late String message;

    if (muacMm >= greenMin) {
      status = HealthStatus.green;
      message = 'MUAC is normal - adequate nutrition';
    } else if (muacMm >= yellowMin) {
      status = HealthStatus.yellow;
      message = 'MUAC indicates risk of malnutrition';
    } else if (muacMm >= redMin) {
      status = HealthStatus.red;
      message = 'MUAC indicates moderate acute malnutrition (MAM)';
    } else {
      status = HealthStatus.red;
      message = 'MUAC indicates severe acute malnutrition (SAM) - urgent care needed';
    }

    final deviation = ((muacMm - greenMin) / greenMin) * 100;

    return HealthCheckResult(
      measurement: muacMm,
      indicator: GrowthIndicator.muac,
      status: status,
      statusMessage: message,
      reference: greenMin,
      deviation: deviation,
    );
  }
}
