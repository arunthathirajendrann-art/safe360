import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  // Base URL for Android Emulator pointing to Windows host backend
  static const String baseUrl = 'http://10.0.2.2:5000/api';
  static const Duration timeoutDuration = Duration(seconds: 10);

  static Future<Map<String, dynamic>> createIncident({
    required String type,
    required double latitude,
    required double longitude,
    String? userId,
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
      'context': context ?? 'Emergency SOS button pressed from Safe360 mobile app',
      'detectionEvidence': detectionEvidence ?? {
        'source': 'MOBILE_APP',
        'trigger': 'SOS_BUTTON',
      },
    };

    try {
      final response = await http
          .post(
            url,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(payload),
          )
          .timeout(timeoutDuration);

      final Map<String, dynamic> responseData = jsonDecode(response.body);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        if (responseData['success'] == true) {
          return responseData;
        } else {
          throw Exception(
            responseData['message'] ?? 'Backend returned unsuccessful response',
          );
        }
      } else {
        throw Exception(
          responseData['message'] ?? 'Server error (${response.statusCode})',
        );
      }
    } on TimeoutException {
      throw Exception(
        'Connection timed out. Unable to reach Safe360 backend at $baseUrl',
      );
    } on http.ClientException catch (e) {
      throw Exception(
        'Network error connecting to backend: ${e.message}',
      );
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Unexpected error: $e');
    }
  }
}
