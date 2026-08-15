import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:speech_to_text/speech_recognition_error.dart';
import 'package:speech_to_text/speech_recognition_result.dart';
import 'package:speech_to_text/speech_to_text.dart';

class SpeechService {
  final SpeechToText _speech = SpeechToText();
  bool _isInitialized = false;
  Completer<bool>? _initCompleter;
  bool _isListening = false;
  String _lastWords = '';

  bool get isListening => _isListening;
  bool get isAvailable => _isInitialized;
  String get lastWords => _lastWords;

  Future<bool> initialize({
    Function(String status)? onStatus,
    Function(SpeechRecognitionError error)? onError,
  }) async {
    if (_isInitialized) return true;
    if (_initCompleter != null) return _initCompleter!.future;

    _initCompleter = Completer<bool>();
    try {
      _isInitialized = await _speech.initialize(
        onStatus: (status) {
          if (status == 'listening') {
            _isListening = true;
          } else if (status == 'notListening' || status == 'done') {
            _isListening = false;
          }
          if (onStatus != null) onStatus(status);
        },
        onError: (error) {
          _isListening = false;
          if (onError != null) onError(error);
        },
      );
      _initCompleter!.complete(_isInitialized);
      return _isInitialized;
    } catch (e) {
      debugPrint('[SpeechService] Initialization error: $e');
      _isInitialized = false;
      _initCompleter!.complete(false);
      return false;
    } finally {
      _initCompleter = null;
    }
  }

  Future<void> startListening({
    required Function(String text, bool isFinal) onResult,
    Function(SpeechRecognitionError error)? onError,
  }) async {
    if (!_isInitialized) {
      bool ready = await initialize(onError: onError);
      if (!ready) {
        if (onError != null) {
          onError(SpeechRecognitionError('Speech recognition unavailable or permission denied', true));
        }
        return;
      }
    }

    _lastWords = '';
    _isListening = true;

    try {
      await _speech.listen(
        onResult: (SpeechRecognitionResult result) {
          _lastWords = result.recognizedWords;
          onResult(result.recognizedWords, result.finalResult);
        },
        listenFor: const Duration(seconds: 30),
        pauseFor: const Duration(seconds: 5),
        partialResults: true,
        cancelOnError: false,
        listenMode: ListenMode.confirmation,
      );
    } catch (e) {
      _isListening = false;
      debugPrint('[SpeechService] Listen error: $e');
    }
  }

  Future<void> stopListening() async {
    if (_isListening) {
      await _speech.stop();
      _isListening = false;
    }
  }

  Future<void> cancelListening() async {
    await _speech.cancel();
    _isListening = false;
  }

  void dispose() {
    _speech.cancel();
  }
}
