import 'package:flutter/foundation.dart';
import 'api/api_service.dart';

class AuthService extends ChangeNotifier {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  String? _token;
  Map<String, dynamic>? _user;
  String _userMode = 'STANDARD'; // 'STANDARD', 'ELDER', 'CAREGIVER'
  List<dynamic> _contacts = [];
  List<dynamic> _connectedPeople = [];
  List<dynamic> _guardianIncidents = [];
  bool _isLoading = false;

  String? get token => _token;
  Map<String, dynamic>? get user => _user;
  String get userMode => _userMode;
  List<dynamic> get contacts => _contacts;
  List<dynamic> get connectedPeople => _connectedPeople;
  List<dynamic> get guardianIncidents => _guardianIncidents;
  bool get isAuthenticated => _token != null && _token!.isNotEmpty;
  bool get isLoading => _isLoading;

  void setUserMode(String mode) {
    _userMode = mode;
    notifyListeners();
  }

  Future<bool> register({
    required String name,
    required String email,
    required String phone,
    required String password,
    String userType = 'STANDARD',
  }) async {
    _isLoading = true;
    notifyListeners();
    try {
      final res = await ApiService.register(
        name: name,
        email: email,
        phone: phone,
        password: password,
        userType: userType,
      );

      _token = res['token'];
      _user = res['user'];
      _userMode = userType;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<bool> login({
    required String email,
    required String password,
  }) async {
    _isLoading = true;
    notifyListeners();
    try {
      final res = await ApiService.login(email: email, password: password);
      _token = res['token'];
      _user = res['user'];
      _userMode = _user?['userType'] ?? 'STANDARD';
      _isLoading = false;
      await fetchContacts();
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  void logout() {
    _token = null;
    _user = null;
    _contacts = [];
    _connectedPeople = [];
    _guardianIncidents = [];
    notifyListeners();
  }

  Future<void> fetchContacts() async {
    if (_token == null) return;
    try {
      _contacts = await ApiService.getContacts(_token!);
      _connectedPeople = await ApiService.getConnectedPeople(_token!);
      _guardianIncidents = await ApiService.getConnectedIncidents(_token!);
      notifyListeners();
    } catch (e) {
      debugPrint('Error fetching contacts: $e');
    }
  }

  Future<bool> addContact({
    required String name,
    required String phone,
    String? email,
    String relationship = 'Family Member',
    String tier = 'PRIMARY',
  }) async {
    if (_token == null) return false;
    try {
      await ApiService.addContact(
        name: name,
        phone: phone,
        token: _token!,
        email: email,
        relationship: relationship,
        tier: tier,
      );
      await fetchContacts();
      return true;
    } catch (e) {
      rethrow;
    }
  }
}
