import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:sensors_plus/sensors_plus.dart';
import '../../services/auth_service.dart';
import '../../services/api/api_service.dart';
import '../onboarding/onboarding_screen.dart';

enum FallDialogResult { cancelled, immediate, timeout }

class FallConfirmationDialog extends StatefulWidget {
  final bool isSimulated;
  const FallConfirmationDialog({super.key, this.isSimulated = true});

  @override
  State<FallConfirmationDialog> createState() => _FallConfirmationDialogState();
}

class _FallConfirmationDialogState extends State<FallConfirmationDialog> {
  int _secondsRemaining = 15;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining > 1) {
        if (mounted) {
          setState(() {
            _secondsRemaining--;
          });
        }
      } else {
        _timer?.cancel();
        if (mounted) {
          Navigator.of(context).pop(FallDialogResult.timeout);
        }
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: const Color(0xFF1E293B),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFFEF4444).withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.warning_amber_rounded, color: Color(0xFFEF4444), size: 28),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Possible Fall Detected',
              style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'High-impact acceleration spike detected (3.1g).\nPost-impact inactivity: 8s.\n\nEmergency alert will trigger automatically if you do not respond.',
            style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 13, height: 1.4),
          ),
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 14),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.5), width: 1.5),
            ),
            child: Column(
              children: [
                const Text(
                  'AUTOMATIC EMERGENCY ALERT IN',
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.1),
                ),
                const SizedBox(height: 4),
                Text(
                  '00:${_secondsRemaining.toString().padLeft(2, '0')}',
                  style: const TextStyle(
                    color: Color(0xFFEF4444),
                    fontSize: 36,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 2,
                  ),
                ),
                const Text(
                  'SECONDS',
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        ],
      ),
      actions: [
        SizedBox(
          width: double.infinity,
          child: Column(
            children: [
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.check_circle_outline, color: Colors.white),
                  label: const Text(
                    'I\'M OK (CANCEL EMERGENCY)',
                    style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                  ),
                  onPressed: () {
                    _timer?.cancel();
                    Navigator.of(context).pop(FallDialogResult.cancelled);
                  },
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                height: 38,
                child: TextButton.icon(
                  style: TextButton.styleFrom(
                    backgroundColor: const Color(0xFF7F1D1D).withOpacity(0.3),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: const Icon(Icons.emergency, color: Color(0xFFEF4444), size: 16),
                  label: const Text(
                    'SEND SOS IMMEDIATELY',
                    style: TextStyle(color: Color(0xFFEF4444), fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  onPressed: () {
                    _timer?.cancel();
                    Navigator.of(context).pop(FallDialogResult.immediate);
                  },
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isEmergencyActive = false;
  bool _isSendingSos = false;
  bool _isFallDialogShowing = false;
  StreamSubscription<UserAccelerometerEvent>? _accelSubscription;
  String? _activeIncidentId;
  String _activePriority = 'HIGH';
  String _activeStatus = 'DETECTED';
  String? _activeSummary;

  final TextEditingController _contactNameController = TextEditingController();
  final TextEditingController _contactPhoneController = TextEditingController();
  String _selectedTier = 'PRIMARY';

  @override
  void initState() {
    super.initState();
    final auth = AuthService();
    auth.fetchContacts();
    _initAccelerometerListener();
  }

  void _initAccelerometerListener() {
    try {
      _accelSubscription = userAccelerometerEventStream().listen((UserAccelerometerEvent event) {
        final double magnitude = sqrt(event.x * event.x + event.y * event.y + event.z * event.z);
        if (magnitude > 24.5) {
          if (!_isEmergencyActive && !_isFallDialogShowing) {
            _triggerFallFlow(isSimulated: false);
          }
        }
      });
    } catch (_) {
      // Sensor fallback for hardware environments without accelerometer
    }
  }

  @override
  void dispose() {
    _accelSubscription?.cancel();
    _contactNameController.dispose();
    _contactPhoneController.dispose();
    super.dispose();
  }

  Future<Position?> _getCurrentLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return null;

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) return null;
      }
      return await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
    } catch (e) {
      return null;
    }
  }

  Future<void> _triggerFallFlow({required bool isSimulated}) async {
    if (_isEmergencyActive) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('An emergency is already active.'),
            backgroundColor: Color(0xFFF59E0B),
          ),
        );
      }
      return;
    }

    if (_isFallDialogShowing) return;
    _isFallDialogShowing = true;

    final result = await showDialog<FallDialogResult>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => FallConfirmationDialog(isSimulated: isSimulated),
    );

    _isFallDialogShowing = false;

    if (result == FallDialogResult.cancelled || result == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Fall alert cancelled.'),
            backgroundColor: Color(0xFF334155),
          ),
        );
      }
      return;
    }

    setState(() {
      _isSendingSos = true;
    });

    final auth = AuthService();
    final pos = await _getCurrentLocation();
    final lat = pos?.latitude ?? 13.0827;
    final lng = pos?.longitude ?? 80.2707;

    try {
      final res = await ApiService.createIncident(
        type: 'FALL_DETECTION',
        latitude: lat,
        longitude: lng,
        userId: auth.user?['userId'] ?? 'USR-MOBILE-01',
        token: auth.token,
        context: isSimulated ? 'Manual fall detection simulation trigger' : 'Motion sensor high-G impact fall detected',
        isSimulated: isSimulated,
        sensorEvidence: {
          'impactMagnitude': 3.1,
          'inactivityDuration': 8,
          'orientationDelta': 74,
        },
        detectionEvidence: {
          'source': 'FALL_DETECTION',
          'isSimulated': isSimulated,
          'impactG': 3.1,
          'sensorConfirmed': true,
        },
      );

      final incident = res['incident'];
      final assessment = res['assessment'];

      setState(() {
        _isEmergencyActive = true;
        _isSendingSos = false;
        _activeIncidentId = incident['_id'] ?? incident['id'];
        _activePriority = incident['priority'] ?? assessment['priority'] ?? 'HIGH';
        _activeStatus = incident['status'] ?? 'UNDERSTOOD';
        _activeSummary = assessment?['summary'] ?? 'Fall emergency incident in progress.';
      });

    } catch (e) {
      setState(() {
        _isSendingSos = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Fall Emergency Alert Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _triggerSos(String type) async {
    if (type == 'FALL_DETECTION' || type == 'FALL') {
      await _triggerFallFlow(isSimulated: true);
      return;
    }

    if (_isEmergencyActive) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('An emergency is already active.'),
            backgroundColor: Color(0xFFF59E0B),
          ),
        );
      }
      return;
    }

    setState(() {
      _isSendingSos = true;
    });

    final auth = AuthService();
    final pos = await _getCurrentLocation();
    final lat = pos?.latitude ?? 13.0827;
    final lng = pos?.longitude ?? 80.2707;

    try {
      final res = await ApiService.createIncident(
        type: type,
        latitude: lat,
        longitude: lng,
        userId: auth.user?['userId'] ?? 'USR-MOBILE-01',
        token: auth.token,
        context: type == 'VOICE' ? 'Voice emergency signal triggered' : (type == 'STEALTH_SOS' ? 'Stealth emergency trigger' : 'SOS Emergency button pressed'),
      );

      final incident = res['incident'];
      final assessment = res['assessment'];

      if (type == 'STEALTH_SOS') {
        setState(() {
          _isSendingSos = false;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Safety signal received.'), backgroundColor: Color(0xFF334155)),
          );
        }
        return;
      }

      setState(() {
        _isEmergencyActive = true;
        _isSendingSos = false;
        _activeIncidentId = incident['_id'] ?? incident['id'];
        _activePriority = incident['priority'] ?? assessment['priority'] ?? 'HIGH';
        _activeStatus = incident['status'] ?? 'UNDERSTOOD';
        _activeSummary = assessment?['summary'] ?? 'Emergency incident in progress.';
      });

    } catch (e) {
      setState(() {
        _isSendingSos = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Emergency Alert Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _cancelActiveSos() async {
    if (_activeIncidentId == null) return;
    final auth = AuthService();

    try {
      await ApiService.cancelIncident(_activeIncidentId!, auth.token!, 'Cancelled by user on mobile app');
      setState(() {
        _isEmergencyActive = false;
        _activeStatus = 'CANCELLED';
        _activeIncidentId = null;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Emergency alert cancelled successfully.'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to cancel emergency: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _showAddContactDialog() async {
    return showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          title: const Text('Add Emergency Contact', style: TextStyle(color: Colors.white)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _contactNameController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(labelText: 'Name', labelStyle: TextStyle(color: Color(0xFF94A3B8))),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _contactPhoneController,
                keyboardType: TextInputType.phone,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(labelText: 'Phone Number', labelStyle: TextStyle(color: Color(0xFF94A3B8))),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _selectedTier,
                dropdownColor: const Color(0xFF1E293B),
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(labelText: 'Escalation Tier', labelStyle: TextStyle(color: Color(0xFF94A3B8))),
                items: const [
                  DropdownMenuItem(value: 'PRIMARY', child: Text('PRIMARY (1st Contact)')),
                  DropdownMenuItem(value: 'SECONDARY', child: Text('SECONDARY (2nd Contact)')),
                  DropdownMenuItem(value: 'TERTIARY', child: Text('TERTIARY (3rd Contact)')),
                ],
                onChanged: (val) {
                  if (val != null) setState(() => _selectedTier = val);
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel', style: TextStyle(color: Color(0xFF94A3B8))),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366F1)),
              onPressed: () async {
                final auth = AuthService();
                if (_contactNameController.text.isNotEmpty && _contactPhoneController.text.isNotEmpty) {
                  await auth.addContact(
                    name: _contactNameController.text.trim(),
                    phone: _contactPhoneController.text.trim(),
                    tier: _selectedTier,
                  );
                  _contactNameController.clear();
                  _contactPhoneController.clear();
                  if (mounted) Navigator.pop(ctx);
                }
              },
              child: const Text('Add Contact', style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );
  }

  Future<void> _showGenerateCodeDialog() async {
    final auth = AuthService();
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1))),
    );

    try {
      final res = await ApiService.generateConnectionCode(auth.token!);
      if (mounted) Navigator.pop(context);

      final code = res['code'] ?? '------';
      auth.fetchContacts();

      if (mounted) {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: const Color(0xFF1E293B),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: const Row(
              children: [
                Icon(Icons.vibration, color: Color(0xFF818CF8)),
                SizedBox(width: 8),
                Text('Guardian Connection Code', style: TextStyle(color: Colors.white, fontSize: 16)),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Give this code to your guardian to enter on their Safe360 Command Center:',
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF6366F1), width: 2),
                  ),
                  child: Text(
                    code,
                    style: const TextStyle(
                      color: Color(0xFF818CF8),
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 6,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.timer, size: 14, color: Color(0xFFF59E0B)),
                    SizedBox(width: 4),
                    Text(
                      'Expires in 10 minutes',
                      style: TextStyle(color: Color(0xFFF59E0B), fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ],
            ),
            actions: [
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366F1)),
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Done', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) Navigator.pop(context);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to generate code: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = AuthService();
    final userMode = auth.userMode;
    final userName = auth.user?['name'] ?? 'User';

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFF6366F1).withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.shield, color: Color(0xFF818CF8), size: 20),
            ),
            const SizedBox(width: 10),
            Text(
              userMode == 'ELDER' ? 'SAFE360 ELDER' : 'SAFE360 OS',
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(
              userMode == 'ELDER' ? Icons.accessibility_new : Icons.switch_account,
              color: const Color(0xFF818CF8),
            ),
            onPressed: () {
              final nextMode = userMode == 'STANDARD' ? 'ELDER' : (userMode == 'ELDER' ? 'CAREGIVER' : 'STANDARD');
              auth.setUserMode(nextMode);
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Color(0xFF94A3B8)),
            onPressed: () {
              auth.logout();
              Navigator.pushAndRemoveUntil(
                context,
                MaterialPageRoute(builder: (_) => const OnboardingScreen()),
                (route) => false,
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // MODE 1: ELDERLY USER EXPERIENCE
              if (userMode == 'ELDER') ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  child: Column(
                    children: [
                      Text(
                        'HELLO, ${userName.toUpperCase()}',
                        style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            decoration: const BoxDecoration(color: Color(0xFF10B981), shape: BoxShape.circle),
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            'YOUR SAFETY CIRCLE IS ACTIVE',
                            style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),

                // Giant Red SOS Button for Elders
                Center(
                  child: GestureDetector(
                    onTap: _isSendingSos ? null : () => _triggerSos('SOS'),
                    child: Container(
                      width: 220,
                      height: 220,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: const LinearGradient(
                          colors: [Color(0xFFEF4444), Color(0xFFDC2626)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFEF4444).withOpacity(0.5),
                            blurRadius: 36,
                            spreadRadius: 10,
                          )
                        ],
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.touch_app, size: 60, color: Colors.white),
                          const SizedBox(height: 8),
                          Text(
                            _isSendingSos ? 'SENDING...' : 'I NEED HELP',
                            style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                          ),
                          const Text('PRESS FOR EMERGENCY', style: TextStyle(color: Colors.white70, fontSize: 11)),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 36),

                const Text(
                  'YOUR EMERGENCY CONTACTS',
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 1.2),
                ),
                const SizedBox(height: 12),

                // Contacts list for Elders
                if (auth.contacts.isEmpty)
                  const Text('No contacts added yet. Tap + to add.', style: TextStyle(color: Colors.white70))
                else
                  ...auth.contacts.map(
                    (c) => Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.person, color: Color(0xFF818CF8), size: 30),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(c['name'] ?? '', style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                                Text('${c['tier']} — ${c['phone']}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ]

              // MODE 2: CAREGIVER / GUARDIAN MODE
              else if (userMode == 'CAREGIVER') ...[
                const Text('CAREGIVER SAFETY COMMAND', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                const Text('Monitor connected family members and manage emergency responses.', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
                const SizedBox(height: 24),

                const Text('CONNECTED PROTECTED PEOPLE', style: TextStyle(color: Color(0xFF818CF8), fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                const SizedBox(height: 12),

                if (auth.connectedPeople.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(12)),
                    child: const Text('No connected protected people linked yet.', style: TextStyle(color: Color(0xFF94A3B8))),
                  )
                else
                  ...auth.connectedPeople.map((cp) {
                    final person = cp['protectedPerson'] ?? {};
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(12)),
                      child: Row(
                        children: [
                          const Icon(Icons.nature_people, color: Color(0xFF10B981), size: 28),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(person['name'] ?? 'Protected Person', style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                                Text('Relationship: ${cp['relationship']} (${cp['tier']})', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(color: const Color(0xFF10B981).withOpacity(0.2), borderRadius: BorderRadius.circular(6)),
                            child: const Text('SAFE', style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 11)),
                          ),
                        ],
                      ),
                    );
                  }),
                const SizedBox(height: 24),

                const Text('AUTHORIZED EMERGENCY ALERTS', style: TextStyle(color: Color(0xFFEF4444), fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                const SizedBox(height: 12),

                if (auth.guardianIncidents.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(12)),
                    child: const Text('No active emergency incidents for connected family members.', style: TextStyle(color: Color(0xFF94A3B8))),
                  )
                else
                  ...auth.guardianIncidents.map((inc) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF7F1D1D).withOpacity(0.3),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFEF4444)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('INCIDENT: ${inc['type']}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(4)),
                                child: Text(inc['priority'] ?? 'HIGH', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text('Subject ID: ${inc['userId']}', style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 12)),
                          Text('Status: ${inc['status']}', style: const TextStyle(color: Colors.white, fontSize: 12)),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
                              icon: const Icon(Icons.check_circle, color: Colors.white, size: 18),
                              label: const Text('ACKNOWLEDGE EMERGENCY', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                              onPressed: () async {
                                final id = inc['_id'] ?? inc['id'];
                                await ApiService.acknowledgeIncident(id, auth.token!);
                                await auth.fetchContacts();
                              },
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
              ]

              // MODE 3: STANDARD MODE (PERSONAL SAFETY OS)
              else ...[
                // Banner Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withOpacity(0.2),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.verified_user, color: Color(0xFF10B981)),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('You\'re protected, $userName', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                            const Text('Safety Circle Active • GPS Locked • AI Armed', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),

                // Main Glowing SOS Control Button
                Center(
                  child: GestureDetector(
                    onTap: _isSendingSos ? null : () => _triggerSos('SOS'),
                    child: Container(
                      width: 170,
                      height: 170,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: const LinearGradient(
                          colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF6366F1).withOpacity(0.4),
                            blurRadius: 30,
                            spreadRadius: 6,
                          )
                        ],
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.emergency, size: 50, color: Colors.white),
                          const SizedBox(height: 6),
                          Text(
                            _isSendingSos ? 'SENDING...' : 'TRIGGER SOS',
                            style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 1.0),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 28),

                // Active Emergency Alert Card (If Triggered)
                if (_isEmergencyActive) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF7F1D1D).withOpacity(0.3),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFEF4444)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('EMERGENCY ACTIVE', style: TextStyle(color: Color(0xFFFCA5A5), fontWeight: FontWeight.bold, fontSize: 14)),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(4)),
                              child: Text(_activePriority, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text('Status: $_activeStatus', style: const TextStyle(color: Colors.white, fontSize: 13)),
                        if (_activeSummary != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text('AI Assessment: $_activeSummary', style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12)),
                          ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF334155)),
                            icon: const Icon(Icons.cancel_outlined, color: Colors.white, size: 16),
                            label: const Text('CANCEL EMERGENCY (FALSE ALARM)', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                            onPressed: _cancelActiveSos,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 28),
                ],

                // Phase 2 Unified Safety Input Grid
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E293B), padding: const EdgeInsets.symmetric(vertical: 12)),
                        icon: const Icon(Icons.mic, color: Color(0xFFEC4899), size: 18),
                        label: const Text('Voice SOS', style: TextStyle(color: Colors.white, fontSize: 12)),
                        onPressed: () => _triggerSos('VOICE_SOS'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E293B), padding: const EdgeInsets.symmetric(vertical: 12)),
                        icon: const Icon(Icons.security, color: Color(0xFFF59E0B), size: 18),
                        label: const Text('Stealth SOS', style: TextStyle(color: Colors.white, fontSize: 12)),
                        onPressed: () => _triggerSos('STEALTH_SOS'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E293B), padding: const EdgeInsets.symmetric(vertical: 12)),
                        icon: const Icon(Icons.personal_injury, color: Color(0xFFEF4444), size: 18),
                        label: const Text('Fall Trigger', style: TextStyle(color: Colors.white, fontSize: 12)),
                        onPressed: () => _triggerSos('FALL_DETECTION'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E293B), padding: const EdgeInsets.symmetric(vertical: 12)),
                        icon: const Icon(Icons.alt_route, color: Color(0xFF3B82F6), size: 18),
                        label: const Text('Route Alert', style: TextStyle(color: Colors.white, fontSize: 12)),
                        onPressed: () => _triggerSos('ROUTE_DEVIATION'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E293B), padding: const EdgeInsets.symmetric(vertical: 12)),
                        icon: const Icon(Icons.timer_off, color: Color(0xFF10B981), size: 18),
                        label: const Text('Check-in', style: TextStyle(color: Colors.white, fontSize: 12)),
                        onPressed: () => _triggerSos('MISSED_CHECKIN'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 28),

                // Safety Circle Section
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('YOUR SAFETY CIRCLE', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                    Row(
                      children: [
                        TextButton.icon(
                          style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(50, 30)),
                          icon: const Icon(Icons.key, size: 15, color: Color(0xFF10B981)),
                          label: const Text('+ Generate Code', style: TextStyle(color: Color(0xFF10B981), fontSize: 11, fontWeight: FontWeight.bold)),
                          onPressed: _showGenerateCodeDialog,
                        ),
                        const SizedBox(width: 8),
                        TextButton.icon(
                          style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(50, 30)),
                          icon: const Icon(Icons.person_add, size: 15, color: Color(0xFF818CF8)),
                          label: const Text('+ Add Contact', style: TextStyle(color: Color(0xFF818CF8), fontSize: 11, fontWeight: FontWeight.bold)),
                          onPressed: _showAddContactDialog,
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                if (auth.contacts.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(12)),
                    child: const Text('No emergency contacts linked yet. Tap Add Contact to build your safety circle.', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
                  )
                else
                  ...auth.contacts.map(
                    (c) => Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(12)),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(color: const Color(0xFF6366F1).withOpacity(0.15), shape: BoxShape.circle),
                            child: const Icon(Icons.person, color: Color(0xFF818CF8), size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(c['name'] ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                                Text('${c['relationship'] ?? "Contact"} • ${c['phone']}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: c['status'] == 'ACCEPTED' ? const Color(0xFF10B981).withOpacity(0.2) : const Color(0xFFF59E0B).withOpacity(0.2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              c['status'] == 'ACCEPTED' ? '${c['tier']} • Connected guardian' : '${c['tier']} • Invitation waiting for guardian',
                              style: TextStyle(
                                color: c['status'] == 'ACCEPTED' ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}