import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../../services/api/api_service.dart';
import '../../services/auth_service.dart';

class StealthCalculatorScreen extends StatefulWidget {
  final String secretSequence;

  const StealthCalculatorScreen({
    super.key,
    this.secretSequence = '112233',
  });

  @override
  State<StealthCalculatorScreen> createState() => _StealthCalculatorScreenState();
}

class _StealthCalculatorScreenState extends State<StealthCalculatorScreen> {
  String _display = '0';
  double? _firstOperand;
  String? _operator;
  bool _shouldResetDisplay = false;

  // Secret sequence tracking
  String _secretBuffer = '';
  Timer? _bufferTimer;
  bool _isSosTriggeredForSession = false;
  bool _isSendingSos = false;

  @override
  void dispose() {
    _bufferTimer?.cancel();
    super.dispose();
  }

  void _onKeyPress(String label) {
    if (label == 'C') {
      _clearAll();
      return;
    }

    if (label == '⌫') {
      _backspace();
      return;
    }

    if (['+', '-', '×', '÷'].contains(label)) {
      _handleOperator(label);
      return;
    }

    if (label == '=') {
      _evaluate();
      return;
    }

    if (label == '%') {
      _handlePercent();
      return;
    }

    // Number or decimal input
    _handleDigit(label);
  }

  void _handleDigit(String digit) {
    // Secret sequence tracking for numeric digits 0-9
    if (RegExp(r'^[0-9]$').hasMatch(digit)) {
      _appendSecretDigit(digit);
    }

    setState(() {
      if (_display == '0' || _shouldResetDisplay || _display == 'Error') {
        _display = digit == '.' ? '0.' : digit;
        _shouldResetDisplay = false;
      } else {
        if (digit == '.' && _display.contains('.')) return;
        if (_display.length < 12) {
          _display += digit;
        }
      }
    });
  }

  void _appendSecretDigit(String digit) {
    _bufferTimer?.cancel();
    _secretBuffer += digit;

    // Keep buffer reasonably sized
    if (_secretBuffer.length > 20) {
      _secretBuffer = _secretBuffer.substring(_secretBuffer.length - 10);
    }

    // Check sequence match
    if (_secretBuffer.endsWith(widget.secretSequence)) {
      _checkAndTriggerStealthSos();
      _secretBuffer = '';
    } else {
      // Reset buffer after 5 seconds of inactivity
      _bufferTimer = Timer(const Duration(seconds: 5), () {
        _secretBuffer = '';
      });
    }
  }

  Future<void> _checkAndTriggerStealthSos() async {
    if (_isSosTriggeredForSession || _isSendingSos) return;

    _isSendingSos = true;
    _isSosTriggeredForSession = true;

    final auth = AuthService();
    double lat = 13.0827; // Safe default fallback
    double lng = 80.2707;

    try {
      // Re-use location handling with timeout guard
      Position? position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium),
      ).timeout(
        const Duration(seconds: 5),
        onTimeout: () => Position(
          longitude: 80.2707,
          latitude: 13.0827,
          timestamp: DateTime.now(),
          accuracy: 0,
          altitude: 0,
          heading: 0,
          speed: 0,
          speedAccuracy: 0,
          altitudeAccuracy: 0,
          headingAccuracy: 0,
        ),
      );

      lat = position.latitude;
      lng = position.longitude;
    } catch (_) {
      // Fallback location on error
    }

    try {
      await ApiService.triggerStealthSos(
        latitude: lat,
        longitude: lng,
        userId: auth.user?['userId'] ?? 'USR-MOBILE-01',
        token: auth.token,
      );
    } catch (_) {
      // Silent error handling to avoid disrupting calculator UI
    } finally {
      _isSendingSos = false;
    }
  }

  void _handleOperator(String op) {
    if (_firstOperand == null) {
      _firstOperand = double.tryParse(_display);
    } else if (!_shouldResetDisplay) {
      _evaluate();
      _firstOperand = double.tryParse(_display);
    }
    _operator = op;
    _shouldResetDisplay = true;
  }

  void _handlePercent() {
    final val = double.tryParse(_display);
    if (val != null) {
      setState(() {
        _display = _formatResult(val / 100.0);
      });
    }
  }

  void _evaluate() {
    if (_firstOperand == null || _operator == null) return;
    final secondOperand = double.tryParse(_display);
    if (secondOperand == null) return;

    double result = 0;
    bool isError = false;

    switch (_operator) {
      case '+':
        result = _firstOperand! + secondOperand;
        break;
      case '-':
        result = _firstOperand! - secondOperand;
        break;
      case '×':
        result = _firstOperand! * secondOperand;
        break;
      case '÷':
        if (secondOperand == 0) {
          isError = true;
        } else {
          result = _firstOperand! / secondOperand;
        }
        break;
    }

    setState(() {
      if (isError) {
        _display = 'Error';
      } else {
        _display = _formatResult(result);
      }
      _firstOperand = null;
      _operator = null;
      _shouldResetDisplay = true;
    });
  }

  String _formatResult(double val) {
    if (val.isNaN || val.isInfinite) return 'Error';
    if (val == val.roundToDouble()) {
      return val.toInt().toString();
    }
    String str = val.toStringAsFixed(6);
    while (str.contains('.') && (str.endsWith('0') || str.endsWith('.'))) {
      str = str.substring(0, str.length - 1);
    }
    return str;
  }

  void _clearAll() {
    setState(() {
      _display = '0';
      _firstOperand = null;
      _operator = null;
      _shouldResetDisplay = false;
    });
  }

  void _backspace() {
    setState(() {
      if (_display.length > 1 && _display != 'Error') {
        _display = _display.substring(0, _display.length - 1);
      } else {
        _display = '0';
      }
    });
  }

  Widget _buildButton(String label, {Color? bgColor, Color? textColor, int flex = 1}) {
    final isSpecialOp = ['÷', '×', '-', '+', '='].contains(label);
    final defaultBg = isSpecialOp ? const Color(0xFF3B82F6) : const Color(0xFF1E293B);
    final defaultText = isSpecialOp ? Colors.white : const Color(0xFFF8FAFC);

    return Expanded(
      flex: flex,
      child: Padding(
        padding: const EdgeInsets.all(6.0),
        child: Material(
          color: bgColor ?? defaultBg,
          borderRadius: BorderRadius.circular(16),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () => _onKeyPress(label),
            splashColor: Colors.white24,
            child: Container(
              height: 68,
              alignment: Alignment.center,
              child: Text(
                label,
                style: TextStyle(
                  color: textColor ?? defaultText,
                  fontSize: 26,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Calculator',
          style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w500),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Display Area
            Expanded(
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                alignment: Alignment.bottomRight,
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  reverse: true,
                  child: Text(
                    _display,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 48,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.2,
                    ),
                  ),
                ),
              ),
            ),
            const Divider(color: Colors.white12, height: 1),
            const SizedBox(height: 12),

            // Keypad Grid
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
              child: Column(
                children: [
                  Row(
                    children: [
                      _buildButton('C', bgColor: const Color(0xFF334155), textColor: const Color(0xFFF43F5E)),
                      _buildButton('⌫', bgColor: const Color(0xFF334155), textColor: const Color(0xFF38BDF8)),
                      _buildButton('%', bgColor: const Color(0xFF334155), textColor: const Color(0xFF38BDF8)),
                      _buildButton('÷'),
                    ],
                  ),
                  Row(
                    children: [
                      _buildButton('7'),
                      _buildButton('8'),
                      _buildButton('9'),
                      _buildButton('×'),
                    ],
                  ),
                  Row(
                    children: [
                      _buildButton('4'),
                      _buildButton('5'),
                      _buildButton('6'),
                      _buildButton('-'),
                    ],
                  ),
                  Row(
                    children: [
                      _buildButton('1'),
                      _buildButton('2'),
                      _buildButton('3'),
                      _buildButton('+'),
                    ],
                  ),
                  Row(
                    children: [
                      _buildButton('0', flex: 2),
                      _buildButton('.'),
                      _buildButton('='),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }
}
