import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import '../../models/voice_message.dart';
import '../../services/api/api_service.dart';
import '../../services/auth_service.dart';
import '../../services/speech_service.dart';
import '../../services/text_to_speech_service.dart';

class VoiceAssistantScreen extends StatefulWidget {
  const VoiceAssistantScreen({super.key});

  @override
  State<VoiceAssistantScreen> createState() => _VoiceAssistantScreenState();
}

class _VoiceAssistantScreenState extends State<VoiceAssistantScreen> with SingleTickerProviderStateMixin {
  final SpeechService _speechService = SpeechService();
  final TextToSpeechService _ttsService = TextToSpeechService();
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _textController = TextEditingController();

  final List<VoiceMessage> _messages = [];
  bool _isListening = false;
  bool _isProcessing = false;
  String _currentPartialText = '';
  String _lastFinalTranscript = '';
  String? _activeIntent;
  bool _requiresConfirmation = false;
  AnimationController? _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);

    _initSpeechAndTts();
    _addInitialGreeting();
  }

  Future<void> _initSpeechAndTts() async {
    await _speechService.initialize();
    await _ttsService.initTts();
  }

  void _addInitialGreeting() {
    _messages.add(
      VoiceMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        role: VoiceMessageRole.assistant,
        content: "Hello! I am your Safe360 Voice Safety Assistant. Speak or type your request below.",
        timestamp: DateTime.now(),
        intent: 'GENERAL_HELP',
      ),
    );
  }

  @override
  void dispose() {
    _pulseController?.dispose();
    _speechService.stopListening();
    _speechService.dispose();
    _ttsService.stop();
    _ttsService.dispose();
    _scrollController.dispose();
    _textController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _toggleListening() async {
    if (_isListening) {
      await _stopListeningAndProcess();
    } else {
      await _startListening();
    }
  }

  Future<void> _startListening() async {
    await _ttsService.stop();
    setState(() {
      _isListening = true;
      _currentPartialText = '';
      _lastFinalTranscript = '';
      _activeIntent = null;
      _requiresConfirmation = false;
    });

    await _speechService.startListening(
      onResult: (text, isFinal) {
        if (!mounted) return;
        setState(() {
          _currentPartialText = text;
          if (isFinal) {
            _lastFinalTranscript = text;
          }
        });

        if (isFinal && text.trim().isNotEmpty) {
          _stopListeningAndProcess();
        }
      },
      onError: (error) {
        if (!mounted) return;
        setState(() {
          _isListening = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Speech recognition error: ${error.errorMsg}. You can also type your request below!'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      },
    );
  }

  Future<void> _stopListeningAndProcess() async {
    await _speechService.stopListening();
    if (!mounted) return;

    final transcriptText = _currentPartialText.trim().isNotEmpty
        ? _currentPartialText.trim()
        : _lastFinalTranscript.trim();

    setState(() {
      _isListening = false;
    });

    if (transcriptText.isEmpty) {
      return;
    }

    await _processUserText(transcriptText);
  }

  Future<void> _handleSubmittedText() async {
    final text = _textController.text.trim();
    if (text.isEmpty) return;

    _textController.clear();
    await _processUserText(text);
  }

  Future<void> _processUserText(String text) async {
    await _ttsService.stop();

    // Add user message to transcript timeline
    final userMsg = VoiceMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      role: VoiceMessageRole.user,
      content: text,
      timestamp: DateTime.now(),
    );

    setState(() {
      _messages.add(userMsg);
      _isProcessing = true;
      _currentPartialText = '';
    });
    _scrollToBottom();

    // Acquire optional position for context
    double? lat;
    double? lng;
    try {
      Position? pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium),
      ).timeout(const Duration(seconds: 3), onTimeout: () => Position(
        longitude: 80.2707,
        latitude: 13.0827,
        timestamp: DateTime.now(),
        accuracy: 0, altitude: 0, heading: 0, speed: 0, speedAccuracy: 0, altitudeAccuracy: 0, headingAccuracy: 0
      ));
      lat = pos.latitude;
      lng = pos.longitude;
    } catch (_) {}

    final auth = AuthService();
    final conversationHistory = _messages.map((m) => {
      'role': m.role == VoiceMessageRole.user ? 'user' : 'assistant',
      'content': m.content,
    }).toList();

    try {
      final res = await ApiService.sendVoiceAssistantChat(
        transcript: text,
        conversationHistory: conversationHistory,
        latitude: lat,
        longitude: lng,
        userId: auth.user?['userId'] ?? 'USR-MOBILE-01',
        token: auth.token,
      );

      if (!mounted) return;

      final replyText = res['replyText'] ?? 'I received your message.';
      final intent = res['intent'] ?? 'GENERAL_CONVERSATION';
      final requiresConfirm = res['requiresConfirmation'] ?? false;

      final assistantMsg = VoiceMessage(
        id: (DateTime.now().millisecondsSinceEpoch + 1).toString(),
        role: VoiceMessageRole.assistant,
        content: replyText,
        timestamp: DateTime.now(),
        intent: intent,
      );

      setState(() {
        _messages.add(assistantMsg);
        _isProcessing = false;
        _activeIntent = intent;
        _requiresConfirmation = requiresConfirm;
      });
      _scrollToBottom();

      // Read aloud Gemini response
      await _ttsService.speak(replyText);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isProcessing = false;
        _messages.add(
          VoiceMessage(
            id: DateTime.now().millisecondsSinceEpoch.toString(),
            role: VoiceMessageRole.assistant,
            content: "Sorry, I had trouble processing your request. Please try again or press the SOS button.",
            timestamp: DateTime.now(),
          ),
        );
      });
      _scrollToBottom();
    }
  }

  Future<void> _executeSafetyIntentAction(String intent) async {
    final auth = AuthService();
    double lat = 13.0827;
    double lng = 80.2707;

    try {
      Position? pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium),
      ).timeout(const Duration(seconds: 3), onTimeout: () => Position(
        longitude: 80.2707, latitude: 13.0827, timestamp: DateTime.now(),
        accuracy: 0, altitude: 0, heading: 0, speed: 0, speedAccuracy: 0, altitudeAccuracy: 0, headingAccuracy: 0
      ));
      lat = pos.latitude;
      lng = pos.longitude;
    } catch (_) {}

    if (intent == 'SOS_REQUEST') {
      try {
        await ApiService.triggerVoiceSos(
          latitude: lat,
          longitude: lng,
          userId: auth.user?['userId'] ?? 'USR-MOBILE-01',
          token: auth.token,
          voicePhrase: _messages.where((m) => m.role == VoiceMessageRole.user).lastOrNull?.content ?? 'Voice Emergency',
        );
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('🚨 VOICE SOS EMERGENCY INCIDENT DISPATCHED!'),
            backgroundColor: Color(0xFFEF4444),
          ),
        );
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error dispatching Voice SOS: $e'), backgroundColor: const Color(0xFFEF4444)),
        );
      }
    } else if (intent == 'INCIDENT_REPORT') {
      try {
        await ApiService.triggerFallDetection(
          latitude: lat,
          longitude: lng,
          userId: auth.user?['userId'] ?? 'USR-MOBILE-01',
          token: auth.token,
          impactG: 3.5,
        );
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('⚠️ Fall Incident report dispatched to Safe360 command center.'),
            backgroundColor: Color(0xFFF59E0B),
          ),
        );
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error dispatching incident: $e'), backgroundColor: const Color(0xFFEF4444)),
        );
      }
    } else if (intent == 'LOCATION_REQUEST') {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('📍 Current Location: Lat ${lat.toStringAsFixed(4)}, Lng ${lng.toStringAsFixed(4)}'),
          backgroundColor: const Color(0xFF10B981),
        ),
      );
    } else if (intent == 'EMERGENCY_CONTACT_REQUEST') {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('👥 Registered Emergency Contacts: ${auth.contacts.length} guardians active.'),
          backgroundColor: const Color(0xFF3B82F6),
        ),
      );
    }
  }

  void _clearConversation() {
    _ttsService.stop();
    setState(() {
      _messages.clear();
      _currentPartialText = '';
      _lastFinalTranscript = '';
      _activeIntent = null;
      _requiresConfirmation = false;
      _addInitialGreeting();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        title: const Row(
          children: [
            Icon(Icons.record_voice_over, color: Color(0xFF38BDF8), size: 22),
            SizedBox(width: 8),
            Text(
              'Safe360 Voice Assistant',
              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(
              _ttsService.isMuted ? Icons.volume_off : Icons.volume_up,
              color: _ttsService.isMuted ? Colors.white38 : const Color(0xFF38BDF8),
            ),
            tooltip: _ttsService.isMuted ? 'Unmute Text-to-Speech' : 'Mute Text-to-Speech',
            onPressed: () {
              setState(() {
                _ttsService.toggleMute();
              });
            },
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline, color: Colors.white70),
            tooltip: 'Clear Conversation',
            onPressed: _clearConversation,
          ),
        ],
      ),
      body: Column(
        children: [
          // Live transcript box (Active Speech feedback)
          if (_isListening || _currentPartialText.isNotEmpty)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.all(12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF38BDF8), width: 1.5),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.mic, color: Color(0xFFEF4444), size: 16),
                      SizedBox(width: 6),
                      Text(
                        'LIVE TRANSCRIPT (SPEAKING...)',
                        style: TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _currentPartialText.isEmpty ? 'Listening for your voice...' : _currentPartialText,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontStyle: _currentPartialText.isEmpty ? FontStyle.italic : FontStyle.normal,
                    ),
                  ),
                ],
              ),
            ),

          // Conversation timeline
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                final isUser = msg.role == VoiceMessageRole.user;

                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.82),
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isUser ? const Color(0xFF2563EB) : const Color(0xFF1E293B),
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(16),
                        topRight: const Radius.circular(16),
                        bottomLeft: Radius.circular(isUser ? 16 : 4),
                        bottomRight: Radius.circular(isUser ? 4 : 16),
                      ),
                      border: Border.all(
                        color: isUser ? Colors.blueAccent : const Color(0xFF334155),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              isUser ? Icons.person : Icons.smart_toy,
                              color: isUser ? Colors.white70 : const Color(0xFF38BDF8),
                              size: 14,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              isUser ? 'You' : 'Safe360 Gemini AI',
                              style: TextStyle(
                                color: isUser ? Colors.white70 : const Color(0xFF38BDF8),
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          msg.content,
                          style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // Thinking / Processing indicator
          if (_isProcessing)
            Container(
              padding: const EdgeInsets.all(10),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF38BDF8)),
                  ),
                  SizedBox(width: 10),
                  Text(
                    'Gemini AI safety engine thinking...',
                    style: TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                ],
              ),
            ),

          // Safety Intent Trigger Card (Bridge to existing Safe360 actions)
          if (_activeIntent != null && _activeIntent != 'GENERAL_CONVERSATION' && _activeIntent != 'GENERAL_HELP')
            Container(
              width: double.infinity,
              margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _activeIntent == 'SOS_REQUEST'
                    ? const Color(0xFF7F1D1D)
                    : const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _activeIntent == 'SOS_REQUEST' ? const Color(0xFFEF4444) : const Color(0xFFF59E0B),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        _activeIntent == 'SOS_REQUEST' ? Icons.warning_amber : Icons.shield_outlined,
                        color: _activeIntent == 'SOS_REQUEST' ? const Color(0xFFEF4444) : const Color(0xFFF59E0B),
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _activeIntent == 'SOS_REQUEST'
                            ? 'DISPATCH EMERGENCY VOICE SOS?'
                            : 'ACTION INTENT DETECTED: ${_activeIntent!.replaceAll('_', ' ')}',
                        style: TextStyle(
                          color: _activeIntent == 'SOS_REQUEST' ? Colors.white : const Color(0xFFF59E0B),
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _activeIntent == 'SOS_REQUEST' ? const Color(0xFFDC2626) : const Color(0xFFD97706),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      icon: Icon(_activeIntent == 'SOS_REQUEST' ? Icons.sos : Icons.play_arrow, color: Colors.white, size: 18),
                      label: Text(
                        _requiresConfirmation && _activeIntent == 'SOS_REQUEST'
                            ? 'CONFIRM & DISPATCH EMERGENCY SOS'
                            : 'EXECUTE ACTION',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                      onPressed: () => _executeSafetyIntentAction(_activeIntent!),
                    ),
                  ),
                ],
              ),
            ),

          // Central Microphone & Text Input Controls Section
          Container(
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
            decoration: const BoxDecoration(
              color: Color(0xFF1E293B),
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    // Microphone button
                    GestureDetector(
                      onTap: _toggleListening,
                      child: AnimatedBuilder(
                        animation: _pulseController!,
                        builder: (context, child) {
                          final scale = _isListening ? 1.0 + (_pulseController!.value * 0.15) : 1.0;
                          return Transform.scale(
                            scale: scale,
                            child: Container(
                              width: 54,
                              height: 54,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: _isListening ? const Color(0xFFEF4444) : const Color(0xFF2563EB),
                                boxShadow: [
                                  BoxShadow(
                                    color: _isListening
                                        ? const Color(0xFFEF4444).withValues(alpha: 0.5)
                                        : const Color(0xFF2563EB).withValues(alpha: 0.3),
                                    blurRadius: 12,
                                    spreadRadius: _isListening ? 4 : 1,
                                  ),
                                ],
                              ),
                              child: Icon(
                                _isListening ? Icons.mic : Icons.mic_none,
                                color: Colors.white,
                                size: 26,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Text Input Field for Typing or Speech Review
                    Expanded(
                      child: TextField(
                        controller: _textController,
                        style: const TextStyle(color: Colors.white, fontSize: 14),
                        onSubmitted: (_) => _handleSubmittedText(),
                        decoration: InputDecoration(
                          hintText: _isListening ? 'Listening...' : 'Type message or tap mic...',
                          hintStyle: const TextStyle(color: Colors.white38, fontSize: 13),
                          filled: true,
                          fillColor: const Color(0xFF0F172A),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(24),
                            borderSide: BorderSide.none,
                          ),
                          suffixIcon: IconButton(
                            icon: const Icon(Icons.send, color: Color(0xFF38BDF8), size: 20),
                            onPressed: _handleSubmittedText,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  _isListening
                      ? 'Listening... Tap mic to finish'
                      : _isProcessing
                          ? 'Processing with Gemini AI...'
                          : 'Tap mic or type message above',
                  style: TextStyle(
                    color: _isListening ? const Color(0xFFEF4444) : Colors.white54,
                    fontSize: 12,
                    fontWeight: _isListening ? FontWeight.bold : FontWeight.normal,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
