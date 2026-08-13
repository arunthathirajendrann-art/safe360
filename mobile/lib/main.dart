import 'package:flutter/material.dart';
import 'screens/home/home_screen.dart';

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
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.red,
        ),
        useMaterial3: true,
      ),
      home: const HomeScreen(),
    );
  }
}