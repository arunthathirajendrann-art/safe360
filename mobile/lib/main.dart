import 'package:flutter/material.dart';
import 'screens/onboarding/onboarding_screen.dart';

void main() {
  runApp(const Safe360App());
}

class Safe360App extends StatelessWidget {
  const Safe360App({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'SAFE360',
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF6366F1),
          brightness: Brightness.dark,
        ),
      ),
      home: const OnboardingScreen(),
    );
  }
}