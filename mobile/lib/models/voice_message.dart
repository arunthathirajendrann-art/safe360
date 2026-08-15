enum VoiceMessageRole { user, assistant }

class VoiceMessage {
  final String id;
  final VoiceMessageRole role;
  final String content;
  final DateTime timestamp;
  final String? intent;
  final bool isPartial;

  VoiceMessage({
    required this.id,
    required this.role,
    required this.content,
    required this.timestamp,
    this.intent,
    this.isPartial = false,
  });

  VoiceMessage copyWith({
    String? content,
    String? intent,
    bool? isPartial,
  }) {
    return VoiceMessage(
      id: id,
      role: role,
      content: content ?? this.content,
      timestamp: timestamp,
      intent: intent ?? this.intent,
      isPartial: isPartial ?? this.isPartial,
    );
  }
}
