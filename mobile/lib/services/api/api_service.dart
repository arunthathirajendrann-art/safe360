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
  }) async {
    final url = Uri.parse('$baseUrl/incidents');

    final payload = {
      'type': type,
      'userId': userId ?? 'USR-MOBILE-01',
      'location': {
        'latitude': latitude,
        'longitude': longitude,
      },
      'context': context ?? 'Emergency SOS triggered from Safe360 Mobile App',
      'detectionEvidence': detectionEvidence ?? {
        'source': 'MOBILE_APP',
        'trigger': 'SOS_BUTTON',
      },
    };

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
}
