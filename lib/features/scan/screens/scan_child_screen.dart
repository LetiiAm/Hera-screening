import 'dart:math';

import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

import '../models/health_status.dart';
import '../services/health_assessment_service.dart';
import '../widgets/camera_button.dart';
import '../widgets/health_status_card.dart';

class ScanChildScreen extends StatefulWidget {
  final String? childName;
  final int? childAgeMonths;

  const ScanChildScreen({
    super.key,
    this.childName = 'Child',
    this.childAgeMonths = 36,
  });

  @override
  State<ScanChildScreen> createState() => _ScanChildScreenState();
}

class _ScanChildScreenState extends State<ScanChildScreen> {
  HealthCheckResult? _heightResult;
  HealthCheckResult? _weightResult;
  HealthCheckResult? _muacResult;
  bool _isLoading = false;
  String _statusMessage = '';
  int _selectedLanguage = 0; // 0: English, 1: Amharic, 2: Afaan Oromoo

  final List<Map<String, String>> _translations = [
    {
      'title': 'Scan Child',
      'subtitle': 'Measure height using AI pose detection',
      'camera_button': 'Open Camera',
      'processing': 'Processing measurement...',
      'simulate': 'Simulate Measurement',
      'results': 'Measurement Results',
      'status_update': 'Updated',
      'error': 'Error',
    },
    {
      'title': 'ልጅ ተቆላል',
      'subtitle': 'ቁመትን በ AI ፖዝ ቅንብር ይለኩ',
      'camera_button': 'ካሜራ ክፍት ያድርጉ',
      'processing': 'መለኪያ በስራ ላይ ነው...',
      'simulate': 'መለኪያ ለመምሰል',
      'results': 'ውጤቶች',
      'status_update': 'ታዘዘ',
      'error': 'ስህተት',
    },
    {
      'title': 'Ilaalcha Ijoollee',
      'subtitle': 'Dheerina AI pose detection fayyadamuun safaruuf',
      'camera_button': 'Kaameraa Banaa',
      'processing': 'Safarsi itti fufaa jira...',
      'simulate': 'Safar Garagalchu',
      'results': 'Bu'ii Safurii',
      'status_update': 'Haaromfamee',
      'error': 'Dhadhii',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final translation = _translations[_selectedLanguage];
    final isMobile = MediaQuery.of(context).size.width < 600;

    return Scaffold(
      appBar: AppBar(
        title: Text(translation['title']!),
        centerTitle: true,
        elevation: 0,
        actions: [
          PopupMenuButton<int>(
            onSelected: (value) {
              setState(() {
                _selectedLanguage = value;
              });
            },
            itemBuilder: (BuildContext context) => [
              const PopupMenuItem<int>(
                value: 0,
                child: Text('English'),
              ),
              const PopupMenuItem<int>(
                value: 1,
                child: Text('Amharic'),
              ),
              const PopupMenuItem<int>(
                value: 2,
                child: Text('Afaan Oromoo'),
              ),
            ],
            child: const Padding(
              padding: EdgeInsets.all(16),
              child: Icon(Icons.language),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header section
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Measuring: ${widget.childName}',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Age: ${widget.childAgeMonths} months',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey[600],
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    translation['subtitle']!,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey[700],
                        ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Main action button - LARGE for rural field conditions
            Center(
              child: CameraButton(
                isLoading: _isLoading,
                label: translation['camera_button']!,
                enabled: !_isLoading,
                onPressed: _handleCameraPress,
              ),
            ),
            const SizedBox(height: 16),

            // Simulation button for testing (development)
            Center(
              child: ElevatedButton.icon(
                onPressed: _isLoading ? null : _simulateMeasurement,
                icon: const Icon(Icons.science),
                label: Text(translation['simulate']!),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Status message
            if (_statusMessage.isNotEmpty)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.shade100,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.blue.shade300),
                ),
                child: Text(
                  _statusMessage,
                  style: TextStyle(
                    color: Colors.blue.shade900,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            const SizedBox(height: 24),

            // Results section
            if (_heightResult != null || _weightResult != null || _muacResult != null)
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    translation['results']!,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 12),
                  if (_heightResult != null) ...
                    [
                      HealthStatusCard(
                        result: _heightResult!,
                        onRetry: _simulateMeasurement,
                      ),
                      const SizedBox(height: 12),
                    ],
                  if (_weightResult != null) ...
                    [
                      HealthStatusCard(
                        result: _weightResult!,
                        onRetry: _simulateMeasurement,
                      ),
                      const SizedBox(height: 12),
                    ],
                  if (_muacResult != null) ...
                    [
                      HealthStatusCard(
                        result: _muacResult!,
                        onRetry: _simulateMeasurement,
                      ),
                      const SizedBox(height: 12),
                    ],
                  // Action buttons after results
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _saveMeasurement,
                          icon: const Icon(Icons.save),
                          label: const Text('Save'),
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            backgroundColor: Colors.green,
                            foregroundColor: Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _clearResults,
                          icon: const Icon(Icons.close),
                          label: const Text('Clear'),
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            backgroundColor: Colors.grey,
                            foregroundColor: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleCameraPress() async {
    final translation = _translations[_selectedLanguage];

    // Request camera permission
    final cameraStatus = await Permission.camera.request();

    if (cameraStatus.isDenied) {
      setState(() {
        _statusMessage = 'Camera permission is required';
      });
      return;
    }

    if (cameraStatus.isPermanentlyDenied) {
      openAppSettings();
      return;
    }

    // In a real app, this would open the camera and use MediaPipe for pose detection
    // For now, we'll simulate it
    setState(() {
      _statusMessage = translation['processing']!;
      _isLoading = true;
    });

    await Future.delayed(const Duration(seconds: 2));

    // Simulate camera measurement
    _simulateMeasurement();
  }

  void _simulateMeasurement() {
    final ageMonths = widget.childAgeMonths ?? 36;
    final random = Random();

    // Simulate realistic measurements with some variation
    // For a 3-year-old (36 months)
    final baseHeight = 95.0 + random.nextDouble() * 20;
    final baseWeight = 14.5 + random.nextDouble() * 4;
    final baseMuac = 125.0 + random.nextDouble() * 30;

    setState(() {
      _heightResult =
          HealthAssessmentService.assessHeight(baseHeight, ageMonths);
      _weightResult = HealthAssessmentService.assessWeight(baseWeight, ageMonths);
      _muacResult = HealthAssessmentService.assessMUAC(baseMuac);
      _statusMessage =
          'Measurement simulated: ${_heightResult!.statusMessage}';
      _isLoading = false;
    });
  }

  void _saveMeasurement() {
    final translation = _translations[_selectedLanguage];

    // In a real app, this would save to database and queue for sync
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${translation['status_update']!}: Measurement saved'),
        backgroundColor: Colors.green,
      ),
    );

    setState(() {
      _statusMessage = 'Measurement saved successfully';
    });
  }

  void _clearResults() {
    setState(() {
      _heightResult = null;
      _weightResult = null;
      _muacResult = null;
      _statusMessage = '';
    });
  }
}
