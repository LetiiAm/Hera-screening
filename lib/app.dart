import 'package:flutter/material.dart';

import 'features/scan/screens/scan_child_screen.dart';

class HealthWorkerApp extends StatelessWidget {
  const HealthWorkerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Health Worker Workspace',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: Colors.blue,
        appBarTheme: const AppBarTheme(
          centerTitle: true,
          backgroundColor: Colors.transparent,
          foregroundColor: Colors.black87,
          elevation: 0,
        ),
      ),
      home: const ScanChildScreen(
        childName: 'Amina',
        childAgeMonths: 36,
      ),
    );
  }
}
