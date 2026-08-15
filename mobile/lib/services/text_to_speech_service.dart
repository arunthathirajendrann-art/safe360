import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';

class TextToSpeechService {
  final FlutterTts _tts = FlutterTts();
  bool _isSpeaking = false;
  bool _isMuted = false;
  bool _isInitialized = false;

  bool get isSpeaking => _isSpeaking;
  bool get isMuted => _isMuted;

  Future<void> initTts() async {
    if (_isInitialized) return;
    try {
      await _tts.setLanguage('en-US');
      await _tts.setSpeechRate(0.5);
      await _tts.setVolume(1.0);
      await _tts.setPitch(1.0);

      _tts.setStartHandler(() {
        _isSpeaking = true;
      });

      _tts.setCompletionHandler(() {
        _isSpeaking = false;
      });

      _tts.setErrorHandler((msg) {
        _isSpeaking = false;
        debugPrint('[TextToSpeechService] Error: $msg');
      });

      _isInitialized = true;
    } catch (e) {
      debugPrint('[TextToSpeechService] Init failed: $e');
    }
  }

  void toggleMute() {
    _isMuted = !_isMuted;
    if (_isMuted && _isSpeaking) {
      stop();
    }
  }

  Future<void> speak(String text) async {
    if (_isMuted || text.trim().isEmpty) return;
    await initTts();
    try {
      await _tts.stop();
      _isSpeaking = true;
      await _tts.speak(text);
    } catch (e) {
      _isSpeaking = false;
      debugPrint('[TextToSpeechService] Speak error: $e');
    }
  }

  Future<void> stop() async {
    try {
      await _tts.stop();
      _isSpeaking = false;
    } catch (_) {}
  }

  void dispose() {
    _tts.stop();
  }
}
