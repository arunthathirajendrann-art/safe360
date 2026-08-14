import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;

class ApiService {
  // Base URL for Windows host backend from Android emulator (10.0.2.2) or local
  static String get baseUrl {
    if (kIsWeb) return 'http://localhost:5000/api';
    if (Platform.isAndroid) return 'http://10.0.2.2:5000/api';
    return 'http://localhost:5000/api';
  }
  static const Duration timeoutDuration = Duration(seconds: 30);

  static Map<String, String> getHeaders([String? token]) {
    final headers = {'Content-Type': 'application/json'};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  // --- INCIDENTS ---
  static Future<Map<String, dynamic>> createIncident({
    required String type,
    required double latitude,
    required double longitude,
    String? userId,
    String? token,
    String? context,
    Map<String, dynamic>? detectionEvidence,
    Map<String, dynamic>? sensorEvidence,
    Map<String, dynamic>? locationEvidence,
    Map<String, dynamic>? voiceEvidence,
    Map<String, dynamic>? checkInEvidence,
    bool isSimulated = false,
  }) async {
    final url = Uri.parse('$baseUrl/incidents');

    final payload = <String, dynamic>{
      'type': type,
      'userId': userId ?? 'USR-MOBILE-01',
      'location': {
        'latitude': latitude,
        'longitude': longitude,
      },
      'context': context ?? 'Emergency SOS triggered from Safe360 Mobile App',
      'isSimulated': isSimulated,
      'detectionEvidence': detectionEvidence ?? {
        'source': 'MOBILE_APP',
        'trigger': 'SOS_BUTTON',
      },
    };

    if (sensorEvidence != null) payload['sensorEvidence'] = sensorEvidence;
    if (locationEvidence != null) payload['locationEvidence'] = locationEvidence;
    if (voiceEvidence != null) payload['voiceEvidence'] = voiceEvidence;
    if (checkInEvidence != null) payload['checkInEvidence'] = checkInEvidence;

    try {
      final response = await http
          .post(
            url,
            headers: getHeaders(token),
            body: jsonEncode(payload),
          )
          .timeout(timeoutDuration);

      final Map<String, dynamic> responseData = jsonDecode(response.body);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        if (responseData['success'] == true) {
          return responseData;
        } else {
          throw Exception(responseData['message'] ?? 'Failed to create incident');
        }
      } else {
        throw Exception(responseData['message'] ?? 'Server error (${response.statusCode})');
      }
    } on TimeoutException {
      throw Exception('Connection timed out connecting to Safe360 backend at $baseUrl');
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Unexpected error: $e');
    }
  }

  // --- PHASE 2 UNIFIED INPUT TRIGGERS ---
  static Future<Map<String, dynamic>> triggerStealthSos({
    required double latitude,
    required double longitude,
    String? userId,
    String? token,
  }) async {
    return createIncident(
      type: 'STEALTH_SOS',
      latitude: latitude,
      longitude: longitude,
      userId: userId,
      token: token,
      context: 'Discreet stealth emergency triggered',
      detectionEvidence: {'source': 'STEALTH_SOS', 'stealthMode': true},
    );
  }

  static Future<Map<String, dynamic>> triggerVoiceSos({
    required double latitude,
    required double longitude,
    String? userId,
    String? token,
    String? voicePhrase,
  }) async {
    return createIncident(
      type: 'VOICE_SOS',
      latitude: latitude,
      longitude: longitude,
      userId: userId,
      token: token,
      context: voicePhrase != null ? 'Voice phrase detected: "$voicePhrase"' : 'Emergency voice trigger detected',
      detectionEvidence: {'source': 'VOICE_SOS', 'phrase': voicePhrase ?? 'Help me'},
    );
  }

  static Future<Map<String, dynamic>> triggerFallDetection({
    required double latitude,
    required double longitude,
    String? userId,
    String? token,
    double impactG = 4.2,
  }) async {
    return createIncident(
      type: 'FALL_DETECTION',
      latitude: latitude,
      longitude: longitude,
      userId: userId,
      token: token,
      context: 'High-G impact fall telemetry detected',
      detectionEvidence: {'source': 'FALL_DETECTION', 'impactG': impactG, 'sensorConfirmed': true},
    );
  }

  static Future<Map<String, dynamic>> triggerRouteDeviation({
    required double latitude,
    required double longitude,
    String? userId,
    String? token,
    double deviationMeters = 450,
  }) async {
    return createIncident(
      type: 'ROUTE_DEVIATION',
      latitude: latitude,
      longitude: longitude,
      userId: userId,
      token: token,
      context: 'Significant route corridor deviation detected ($deviationMeters meters off-route)',
      detectionEvidence: {'source': 'ROUTE_DEVIATION', 'deviationMeters': deviationMeters, 'thresholdMeters': 300},
    );
  }

  static Future<Map<String, dynamic>> triggerMissedCheckIn({
    String? userId,
    String? token,
    String? scheduledTime,
  }) async {
    return createIncident(
      type: 'MISSED_CHECKIN',
      latitude: 0,
      longitude: 0,
      userId: userId,
      token: token,
      context: 'Scheduled safety check-in deadline missed',
      detectionEvidence: {'source': 'MISSED_CHECKIN', 'scheduledTime': scheduledTime ?? 'Configured Check-in'},
    );
  }

  // --- AUTHENTICATION ---
  static Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String phone,
    required String password,
    String userType = 'STANDARD',
  }) async {
    final url = Uri.parse('$baseUrl/auth/register');
    final response = await http.post(
      url,
      headers: getHeaders(),
      body: jsonEncode({
        'name': name,
        'email': email,
        'phone': phone,
        'password': password,
        'userType': userType,
      }),
    ).timeout(timeoutDuration);

    final data = jsonDecode(response.body);
    if (response.statusCode == 201 && data['success'] == true) {
      return data;
    }
    throw Exception(data['message'] ?? 'Registration failed');
  }

  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final url = Uri.parse('$baseUrl/auth/login');
    final response = await http.post(
      url,
      headers: getHeaders(),
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    ).timeout(timeoutDuration);

    final data = jsonDecode(response.body);
    if (response.statusCode == 200 && data['success'] == true) {
      return data;
    }
    throw Exception(data['message'] ?? 'Login failed');
  }

  // --- CONTACTS & GUARDIANS ---
  static Future<Map<String, dynamic>> addContact({
    required String name,
    required String phone,
    required String token,
    String? email,
    String relationship = 'Family Member',
    String tier = 'PRIMARY',
  }) async {
    final url = Uri.parse('$baseUrl/contacts');
    final response = await http.post(
      url,
      headers: getHeaders(token),
      body: jsonEncode({
        'name': name,
        'phone': phone,
        'email': email ?? '',
        'relationship': relationship,
        'tier': tier,
      }),
    ).timeout(timeoutDuration);

    final data = jsonDecode(response.body);
    if (response.statusCode == 201 && data['success'] == true) {
      return data;
    }
    throw Exception(data['message'] ?? 'Failed to add emergency contact');
  }

  static Future<List<dynamic>> getContacts(String token) async {
    final url = Uri.parse('$baseUrl/contacts');
    final response = await http.get(url, headers: getHeaders(token)).timeout(timeoutDuration);

    final data = jsonDecode(response.body);
    if (response.statusCode == 200 && data['success'] == true) {
      return data['contacts'] ?? [];
    }
    return [];
  }

  static Future<Map<String, dynamic>> acceptInvite(String token, String inviteToken) async {
    final url = Uri.parse('$baseUrl/contacts/accept-invite');
    final response = await http.post(
      url,
      headers: getHeaders(token),
      body: jsonEncode({'token': inviteToken}),
    ).timeout(timeoutDuration);

    final data = jsonDecode(response.body);
    if (response.statusCode == 200 && data['success'] == true) {
      return data;
    }
    throw Exception(data['message'] ?? 'Failed to accept invitation');
  }

  static Future<List<dynamic>> getConnectedPeople(String token) async {
    final url = Uri.parse('$baseUrl/contacts/guardians/people');
    final response = await http.get(url, headers: getHeaders(token)).timeout(timeoutDuration);

    final data = jsonDecode(response.body);
    if (response.statusCode == 200 && data['success'] == true) {
      return data['connectedPeople'] ?? [];
    }
    return [];
  }

  static Future<List<dynamic>> getConnectedIncidents(String token) async {
    final url = Uri.parse('$baseUrl/contacts/guardians/incidents');
    final response = await http.get(url, headers: getHeaders(token)).timeout(timeoutDuration);

    final data = jsonDecode(response.body);
    if (response.statusCode == 200 && data['success'] == true) {
      return data['incidents'] ?? [];
    }
    return [];
  }

  static Future<Map<String, dynamic>> acknowledgeIncident(String incidentId, String token) async {
    final url = Uri.parse('$baseUrl/incidents/$incidentId/acknowledge');
    final response = await http.post(
      url,
      headers: getHeaders(token),
      body: jsonEncode({'tier': 'PRIMARY'}),
    ).timeout(timeoutDuration);

    final data = jsonDecode(response.body);
    if (response.statusCode == 200 && data['success'] == true) {
      return data;
    }
    throw Exception(data['message'] ?? 'Failed to acknowledge emergency');
  }

  static Future<Map<String, dynamic>> generateConnectionCode(String token) async {
    final url = Uri.parse('$baseUrl/contacts/generate-code');
    final response = await http.post(
      url,
      headers: getHeaders(token),
    ).timeout(timeoutDuration);

    final data = jsonDecode(response.body);
    if ((response.statusCode == 200 || response.statusCode == 201) && data['success'] == true) {
      return data;
    }
    throw Exception(data['message'] ?? 'Failed to generate connection code');
  }

  static Future<Map<String, dynamic>> cancelIncident(String incidentId, String token, [String? reason]) async {
    final url = Uri.parse('$baseUrl/incidents/$incidentId/cancel');
    final response = await http.post(
      url,
      headers: getHeaders(token),
      body: jsonEncode({'reason': reason ?? 'False alarm cancelled by user'}),
    ).timeout(timeoutDuration);

    final data = jsonDecode(response.body);
    if (response.statusCode == 200 && data['success'] == true) {
      return data;
    }
    throw Exception(data['message'] ?? 'Failed to cancel incident');
  }

  static Future<Map<String, dynamic>> getIncidentById(String incidentId, [String? token]) async {
    final url = Uri.parse('$baseUrl/incidents/$incidentId');
    final response = await http.get(url, headers: getHeaders(token)).timeout(timeoutDuration);

    final data = jsonDecode(response.body);
    if (response.statusCode == 200 && data['success'] == true) {
      return data;
    }
    throw Exception(data['message'] ?? 'Failed to fetch incident');
  }
}
