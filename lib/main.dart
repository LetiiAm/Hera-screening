import 'dart:io';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:permission_handler/permission_handler.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:convert';

/// Configure your backend here:
/// - For Android emulator: use http://10.0.2.2:8080
/// - For iOS simulator: use http://localhost:8080
/// - For a deployed FastAPI on Cloud Run: use https://your-cloud-run-url
const String backendUrl = String.fromEnvironment(
  'BACKEND_URL',
  defaultValue: 'http://10.0.2.2:8080',
);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // load available cameras
  final cameras = await availableCameras();
  runApp(MyApp(cameras: cameras));
}

class MyApp extends StatelessWidget {
  final List<CameraDescription> cameras;
  const MyApp({super.key, required this.cameras});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Nutrition Assessment',
      theme: ThemeData(primarySwatch: Colors.teal),
      home: HomePage(cameras: cameras),
    );
  }
}

class HomePage extends StatefulWidget {
  final List<CameraDescription> cameras;
  const HomePage({super.key, required this.cameras});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with WidgetsBindingObserver {
  CameraController? _controller;
  Future<void>? _initializeControllerFuture;
  XFile? _capturedImage;

  final _formKey = GlobalKey<FormState>();
  final _regionController = TextEditingController();
  final _ageController = TextEditingController();
  final _weightController = TextEditingController();
  final _heightController = TextEditingController();
  String _muacStatus = 'unknown';
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initCamera();
  }

  Future<void> _initCamera() async {
    // request camera permission
    final status = await Permission.camera.request();
    if (!status.isGranted) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Camera permission is required.')),
        );
      }
      return;
    }

    if (widget.cameras.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No cameras found on this device.')),
        );
      }
      return;
    }

    final camera = widget.cameras.firstWhere(
      (c) => c.lensDirection == CameraLensDirection.back,
      orElse: () => widget.cameras.first,
    );

    _controller = CameraController(
      camera,
      ResolutionPreset.medium,
      enableAudio: false,
      imageFormatGroup: ImageFormatGroup.jpeg,
    );

    _initializeControllerFuture = _controller!.initialize();
    try {
      await _initializeControllerFuture;
      if (mounted) setState(() {});
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to initialize camera: $e')),
        );
      }
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller?.dispose();
    _regionController.dispose();
    _ageController.dispose();
    _weightController.dispose();
    _heightController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) {
      return;
    }
    if (state == AppLifecycleState.inactive) {
      controller.dispose();
    } else if (state == AppLifecycleState.resumed) {
      _initCamera();
    }
  }

  Future<void> _takePicture() async {
    if (_controller == null || !_controller!.value.isInitialized) return;
    try {
      final xfile = await _controller!.takePicture();

      // Move to temporary directory for stable path access
      final tempDir = await getTemporaryDirectory();
      final newPath = '${tempDir.path}/${DateTime.now().millisecondsSinceEpoch}.jpg';
      final file = File(xfile.path);
      await file.copy(newPath);

      setState(() {
        _capturedImage = XFile(newPath);
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Capture failed: $e')));
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _isSubmitting = true;
    });

    final payload = {
      "region": _regionController.text.trim(),
      "age_months": int.tryParse(_ageController.text.trim()) ?? 0,
      "weight_kg": double.tryParse(_weightController.text.trim()) ?? 0.0,
      "height_cm": double.tryParse(_heightController.text.trim()) ?? 0.0,
      "muac_status": _muacStatus == 'unknown' ? null : _muacStatus,
    };

    try {
      final uri = Uri.parse('$backendUrl/api/sync-record');
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Submitted: ${body['message'] ?? 'OK'}')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to submit: ${response.statusCode}')),
        );
      }

      // Optionally: if you want to upload the captured photo, you can implement
      // a separate multipart endpoint on your backend and upload _capturedImage there.
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Network error: $e')));
    } finally {
      setState(() {
        _isSubmitting = false;
      });
    }
  }

  Widget _buildCameraPreview() {
    if (_controller == null) {
      return const Center(child: Text('Camera initializing...'));
    }

    return FutureBuilder<void>(
      future: _initializeControllerFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.done && _controller!.value.isInitialized) {
          final size = MediaQuery.of(context).size;
          final deviceRatio = size.width / size.height;
          return ClipRect(
            child: Transform.scale(
              scale: _controller!.value.aspectRatio / deviceRatio,
              child: Center(child: CameraPreview(_controller!)),
            ),
          );
        } else if (snapshot.hasError) {
          return Center(child: Text('Camera error: ${snapshot.error}'));
        } else {
          return const Center(child: CircularProgressIndicator());
        }
      },
    );
  }

  Widget _buildForm() {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          TextFormField(
            controller: _regionController,
            decoration: const InputDecoration(labelText: 'Region', hintText: 'e.g., north-region'),
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Region is required' : null,
          ),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _ageController,
                  decoration: const InputDecoration(labelText: 'Age (months)'),
                  keyboardType: TextInputType.number,
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Age required';
                    final n = int.tryParse(v.trim());
                    if (n == null || n < 0) return 'Enter valid age';
                    return null;
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextFormField(
                  controller: _weightController,
                  decoration: const InputDecoration(labelText: 'Weight (kg)'),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Weight required';
                    final n = double.tryParse(v.trim());
                    if (n == null || n <= 0) return 'Enter valid weight';
                    return null;
                  },
                ),
              ),
            ],
          ),
          TextFormField(
            controller: _heightController,
            decoration: const InputDecoration(labelText: 'Height (cm)'),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            validator: (v) {
              if (v == null || v.trim().isEmpty) return 'Height required';
              final n = double.tryParse(v.trim());
              if (n == null || n <= 0) return 'Enter valid height';
              return null;
            },
          ),
          DropdownButtonFormField<String>(
            value: _muacStatus,
            decoration: const InputDecoration(labelText: 'MUAC status'),
            items: const [
              DropdownMenuItem(value: 'unknown', child: Text('Unknown')),
              DropdownMenuItem(value: 'green', child: Text('Green')),
              DropdownMenuItem(value: 'yellow', child: Text('Yellow')),
              DropdownMenuItem(value: 'red', child: Text('Red')),
            ],
            onChanged: (v) => setState(() => _muacStatus = v ?? 'unknown'),
          ),
          const SizedBox(height: 8),
          _capturedImage != null
              ? Column(
                  children: [
                    const Text('Captured photo (optional)'),
                    const SizedBox(height: 8),
                    Image.file(File(_capturedImage!.path), height: 160),
                    TextButton.icon(
                      onPressed: () {
                        setState(() {
                          _capturedImage = null;
                        });
                      },
                      icon: const Icon(Icons.delete),
                      label: const Text('Remove photo'),
                    ),
                  ],
                )
              : const SizedBox.shrink(),
          const SizedBox(height: 8),
          ElevatedButton.icon(
            onPressed: _isSubmitting ? null : _submit,
            icon: _isSubmitting ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.send),
            label: const Text('Submit assessment'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final topHeight = MediaQuery.of(context).size.height * 0.42;
    return Scaffold(
      appBar: AppBar(title: const Text('Nutrition Assessment')),
      body: SingleChildScrollView(
        child: Column(
          children: [
            SizedBox(height: topHeight, width: double.infinity, child: _buildCameraPreview()),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8),
              child: Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _takePicture,
                      icon: const Icon(Icons.camera_alt),
                      label: const Text('Capture'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    onPressed: () {
                      // quick reset form
                      _regionController.clear();
                      _ageController.clear();
                      _weightController.clear();
                      _heightController.clear();
                      setState(() {
                        _muacStatus = 'unknown';
                        _capturedImage = null;
                      });
                    },
                    icon: const Icon(Icons.refresh),
                    label: const Text('Reset'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.grey[600]),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8),
              child: _buildForm(),
            ),
            const SizedBox(height: 24),
            const Divider(),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12.0),
              child: Text(
                'Backend: $backendUrl',
                style: const TextStyle(fontSize: 12, color: Colors.black54),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
